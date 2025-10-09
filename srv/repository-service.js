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
  const { Repositories, Dependencies, AuditResults } = this.entities;

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
        
        if (!existing) {
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

          // Run audit (mock for now)
          const auditResults = await auditDependencies(dependencies);
          
          // Insert audit results
          const auditEntries = auditResults.map(result => ({
            repository_ID: repoId,
            severity: result.severity,
            count: result.count,
            timestamp: new Date().toISOString(),
          }));
          await INSERT.into(AuditResults).entries(auditEntries);

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
