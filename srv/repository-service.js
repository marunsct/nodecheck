const cds = require('@sap/cds');
const GitProviderFactory = require('./git-providers/provider-factory');
const {
  getLatestVersion,
  calculateRecommendedVersion,
  parseDependencies,
  determineStatus,
  auditDependencies,
} = require('./lib/analysis-helper');

module.exports = cds.service.impl(async function () {
  const { Repositories, Dependencies, AuditResults, SecurityAdvisories, AdvisoryFindings, AdvisoryActions } = this.entities;

  // GitHub token - in production, this should come from user session or environment
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

  /**
   * Action: Fetch repositories from GitHub
   */
  this.on('fetchRepositories', async (req) => {
    if (!GITHUB_TOKEN) {
      req.error(401, 'GitHub token not configured. Please set GITHUB_TOKEN environment variable.');
      return;
    }

    try {
      const provider = GitProviderFactory.getProvider('github', GITHUB_TOKEN);
      const repos = await provider.listRepos();

      // Store repositories in database
      for (const repo of repos) {
        const existing = await SELECT.one.from(Repositories).where({ fullName: repo.fullName });

        if (existing) {
          await UPDATE(Repositories)
            .set({
              name: repo.name,
              provider: repo.provider,
              url: repo.url,
            })
            .where({ ID: existing.ID });
        } else {
          await INSERT.into(Repositories).entries({
            name: repo.name,
            fullName: repo.fullName,
            provider: repo.provider,
            url: repo.url,
            status: null,
            lastAnalyzed: null,
          });
        }
      }

      return repos;
    } catch (error) {
      console.error('Error fetching repositories:', error);
      req.error(500, `Failed to fetch repositories: ${error.message}`);
    }
  });

  /**
   * Action: Analyze repositories
   */
  this.on('analyzeRepositories', async (req) => {
    const { repositoryIds } = req.data;

    if (!GITHUB_TOKEN) {
      req.error(401, 'GitHub token not configured. Please set GITHUB_TOKEN environment variable.');
      return;
    }

    if (!repositoryIds || repositoryIds.length === 0) {
      req.error(400, 'No repositories selected for analysis');
      return;
    }

    try {
      const provider = GitProviderFactory.getProvider('github', GITHUB_TOKEN);
      let analyzedCount = 0;

      for (const repoId of repositoryIds) {
        try {
          // Fetch repository details
          const repo = await SELECT.one.from(Repositories).where({ ID: repoId });
          
          if (!repo) {
            console.warn(`Repository ${repoId} not found`);
            continue;
          }

          // Parse fullName to get owner and repo
          const [owner, repoName] = repo.fullName.split('/');

          // Fetch package.json
          let packageJsonContent;
          try {
            packageJsonContent = await provider.getFile(owner, repoName, 'package.json');
          } catch (error) {
            console.warn(`No package.json found in ${repo.fullName}`);
            continue;
          }

          // Parse dependencies
          const dependencies = parseDependencies(packageJsonContent);

          // Delete existing dependencies and audit results
          await DELETE.from(Dependencies).where({ repository_ID: repoId });
          await DELETE.from(AuditResults).where({ repository_ID: repoId });

          // Analyze each dependency
          const dependencyEntries = [];
          for (const [packageName, currentVersion] of Object.entries(dependencies)) {
            // Clean version (remove ^, ~, etc.)
            const cleanVersion = currentVersion.replace(/[\^~>=<]/g, '');
            
            // Get latest version from npm registry
            const latestVersion = await getLatestVersion(packageName);
            const recommendedVersion = latestVersion ? calculateRecommendedVersion(latestVersion) : null;

            dependencyEntries.push({
              repository_ID: repoId,
              packageName,
              currentVersion: cleanVersion,
              latestVersion: latestVersion || 'unknown',
              recommendedVersion: recommendedVersion || cleanVersion,
              vulnerabilities: 0,
            });
          }

          // Insert dependencies
          if (dependencyEntries.length > 0) {
            await INSERT.into(Dependencies).entries(dependencyEntries);
          }

          // Run npm audit with enhanced details
          const auditResults = await auditDependencies(dependencies);
          
          // Insert basic audit results and get generated IDs
          const timestamp = new Date().toISOString();
          const auditEntries = [];
          for (const result of auditResults) {
            // Skip entries where we're just adding them to the array object
            if (typeof result === 'object' && !Array.isArray(result) && result.severity) {
              auditEntries.push({
                repository_ID: repoId,
                severity: result.severity,
                count: result.count,
                timestamp: timestamp,
              });
            }
          }
          
          await INSERT.into(AuditResults).entries(auditEntries);
          
          // Get the inserted audit records with their generated IDs
          const insertedAudits = await SELECT.from(AuditResults)
            .where({ repository_ID: repoId, timestamp: timestamp });
          
          // Store detailed advisories if available
          if (auditResults.detailedAdvisories && auditResults.detailedAdvisories.length > 0) {
            // Get the audit result ID for critical severity
            const criticalAudit = insertedAudits.find(a => a.severity === 'critical');
            const highAudit = insertedAudits.find(a => a.severity === 'high');
            const moderateAudit = insertedAudits.find(a => a.severity === 'moderate');
            const lowAudit = insertedAudits.find(a => a.severity === 'low');
            
            // Process each advisory and link to appropriate severity audit result
            for (const advisory of auditResults.detailedAdvisories) {
              let auditResultId;
              
              // Determine which audit result to associate with based on severity
              switch(advisory.severity) {
                case 'critical':
                  auditResultId = criticalAudit?.ID;
                  break;
                case 'high':
                  auditResultId = highAudit?.ID;
                  break;
                case 'moderate':
                  auditResultId = moderateAudit?.ID;
                  break;
                default:
                  auditResultId = lowAudit?.ID;
              }
              
              if (!auditResultId) continue;
              
              // Insert security advisory
              const advisoryEntry = {
                auditResult_ID: auditResultId,
                packageName: advisory.packageName,
                advisoryId: advisory.id?.toString() || '',
                title: advisory.title || '',
                severity: advisory.severity || '',
                vulnerableVersions: advisory.vulnerableVersions || '',
                recommendation: advisory.recommendation || '',
                url: advisory.url || '',
                cves: JSON.stringify(advisory.cves || []),
                cvssScore: advisory.cvss || 0
              };
              
              const result = await INSERT.into(SecurityAdvisories).entries(advisoryEntry);
              const advisoryId = result.data?.ID;
              
              if (advisoryId) {
                // Insert findings
                if (advisory.findings && advisory.findings.length > 0) {
                  const findingEntries = advisory.findings.map(finding => ({
                    advisory_ID: advisoryId,
                    version: finding.version || '',
                    paths: JSON.stringify(finding.paths || [])
                  }));
                  await INSERT.into(AdvisoryFindings).entries(findingEntries);
                }
              }
            }
            
            // Insert recommended actions if available
            if (auditResults.recommendedActions && auditResults.recommendedActions.length > 0) {
              for (const action of auditResults.recommendedActions) {
                // Find the associated advisory for this action
                const packageName = action.module;
                const advisories = await SELECT.from(SecurityAdvisories)
                  .where({ 
                    packageName: packageName,
                    auditResult_ID: { in: insertedAudits.map(a => a.ID) }
                  });
                
                if (advisories && advisories.length > 0) {
                  // Add action for each related advisory
                  for (const advisory of advisories) {
                    await INSERT.into(AdvisoryActions).entries({
                      advisory_ID: advisory.ID,
                      action: action.action || '',
                      module: action.module || '',
                      target: action.target || '',
                      isMajor: action.isMajor || false,
                      resolves: JSON.stringify(action.resolves || [])
                    });
                  }
                }
              }
            }
          }

          // Update repository status
          const status = determineStatus(auditResults);
          await UPDATE(Repositories)
            .set({ status, lastAnalyzed: new Date().toISOString() })
            .where({ ID: repoId });

          analyzedCount++;
        } catch (error) {
          console.error(`Error analyzing repository ${repoId}:`, error);
        }
      }

      return {
        success: true,
        message: `Successfully analyzed ${analyzedCount} out of ${repositoryIds.length} repositories`,
      };
    } catch (error) {
      console.error('Error in analyzeRepositories:', error);
      req.error(500, `Failed to analyze repositories: ${error.message}`);
    }
  });

  /**
   * Action: Upgrade packages
   */
  this.on('upgradePackages', async (req) => {
    const { repositoryId, packageNames } = req.data;

    if (!GITHUB_TOKEN) {
      req.error(401, 'GitHub token not configured. Please set GITHUB_TOKEN environment variable.');
      return;
    }

    if (!repositoryId) {
      req.error(400, 'Repository ID is required');
      return;
    }

    if (!packageNames || packageNames.length === 0) {
      req.error(400, 'No packages selected for upgrade');
      return;
    }

    try {
      const provider = GitProviderFactory.getProvider('github', GITHUB_TOKEN);

      // Fetch repository details
      const repo = await SELECT.one.from(Repositories).where({ ID: repositoryId });
      
      if (!repo) {
        req.error(404, 'Repository not found');
        return;
      }

      // Parse fullName to get owner and repo
      const [owner, repoName] = repo.fullName.split('/');

      // Fetch current package.json
      const packageJsonContent = await provider.getFile(owner, repoName, 'package.json');
      const packageJson = JSON.parse(packageJsonContent);

      // Fetch dependencies to upgrade
      const dependenciesToUpgrade = await SELECT.from(Dependencies)
        .where({ repository_ID: repositoryId })
        .and({ packageName: { in: packageNames } });

      // Update versions in package.json
      let updatedCount = 0;
      for (const dep of dependenciesToUpgrade) {
        const newVersion = dep.recommendedVersion;
        
        if (packageJson.dependencies && packageJson.dependencies[dep.packageName]) {
          packageJson.dependencies[dep.packageName] = `^${newVersion}`;
          updatedCount++;
        } else if (packageJson.devDependencies && packageJson.devDependencies[dep.packageName]) {
          packageJson.devDependencies[dep.packageName] = `^${newVersion}`;
          updatedCount++;
        }
      }

      if (updatedCount === 0) {
        return {
          success: false,
          message: 'No packages were updated',
          commitUrl: null,
        };
      }

      // Create commit
      const updatedContent = JSON.stringify(packageJson, null, 2) + '\n';
      const commitMessage = `chore: upgrade ${updatedCount} package(s) to recommended versions`;
      
      const result = await provider.createCommit(
        owner,
        repoName,
        'main', // TODO: Use default branch from repo
        'package.json',
        updatedContent,
        commitMessage
      );

      return {
        success: result.success,
        message: `Successfully upgraded ${updatedCount} package(s)`,
        commitUrl: result.commitUrl,
      };
    } catch (error) {
      console.error('Error in upgradePackages:', error);
      req.error(500, `Failed to upgrade packages: ${error.message}`);
    }
  });
});
