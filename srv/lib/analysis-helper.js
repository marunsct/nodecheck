const axios = require('axios');
const semver = require('semver');

/**
 * Fetch the latest version of a package from npm registry
 */
async function getLatestVersion(packageName) {
  try {
    const response = await axios.get(`https://registry.npmjs.org/${packageName}/latest`, {
      timeout: 5000,
    });
    return response.data.version;
  } catch (error) {
    console.error(`Error fetching version for ${packageName}:`, error.message);
    return null;
  }
}

/**
 * Calculate recommended version (1 minor version behind latest)
 */
function calculateRecommendedVersion(latestVersion) {
  try {
    if (!latestVersion || !semver.valid(latestVersion)) {
      return latestVersion;
    }

    const parsed = semver.parse(latestVersion);
    if (!parsed) {
      return latestVersion;
    }

    // If minor version is 0, keep it as is
    if (parsed.minor === 0) {
      return latestVersion;
    }

    // Decrement minor version by 1, reset patch to 0
    const recommendedVersion = `${parsed.major}.${parsed.minor - 1}.0`;
    return recommendedVersion;
  } catch (error) {
    console.error(`Error calculating recommended version for ${latestVersion}:`, error.message);
    return latestVersion;
  }
}

/**
 * Parse package.json and extract dependencies
 */
function parseDependencies(packageJsonContent) {
  try {
    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = {};

    // Merge dependencies and devDependencies
    if (packageJson.dependencies) {
      Object.assign(dependencies, packageJson.dependencies);
    }
    if (packageJson.devDependencies) {
      Object.assign(dependencies, packageJson.devDependencies);
    }

    return dependencies;
  } catch (error) {
    console.error('Error parsing package.json:', error.message);
    throw new Error(`Invalid package.json: ${error.message}`);
  }
}

/**
 * Determine repository status based on audit results
 */
function determineStatus(auditResults) {
  if (!auditResults || auditResults.length === 0) {
    return 'green';
  }

  // Check for critical or high severity issues
  const hasCritical = auditResults.some(result => 
    result.severity === 'critical' && result.count > 0
  );
  const hasHigh = auditResults.some(result => 
    result.severity === 'high' && result.count > 0
  );
  const hasModerate = auditResults.some(result => 
    result.severity === 'moderate' && result.count > 0
  );

  if (hasCritical || hasHigh) {
    return 'red';
  } else if (hasModerate) {
    return 'yellow';
  } else {
    return 'green';
  }
}

/**
 * Run npm audit on dependencies (simulated for now)
 */
async function auditDependencies(dependencies) {
  const severities = ['info', 'low', 'moderate', 'high', 'critical'];
  const emptyResult = severities.map(severity => ({ severity, count: 0 }));

  if (!dependencies || Object.keys(dependencies).length === 0) {
    return emptyResult;
  }

  // Create payload with required structure
  const payload = {
    name: 'Package Analysis', // Use actual repository name if available
    version: '1.0.0',
    requires: {}, // Object mapping package names to versions
    dependencies: {}, // Object with detailed package info
  };

  for (const [packageName, rawVersion] of Object.entries(dependencies)) {
    const cleaned = typeof rawVersion === 'string' ? rawVersion.trim() : '';
    const coerced = semver.coerce(cleaned);

    if (!coerced) {
      continue;
    }
    
    // Add to requires object
    payload.requires[packageName] = coerced.version;
    
    // Add to dependencies object with correct structure
    payload.dependencies[packageName] = {
      version: coerced.version,
    };
  }

  if (Object.keys(payload.dependencies).length === 0) {
    return emptyResult;
  }

  const registryUrl = process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org';
  const auditUrl = `${registryUrl.replace(/\/$/, '')}/-/npm/v1/security/audits`;

  try {
    const response = await axios.post(auditUrl, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Extract basic vulnerability counts
    const vulnerabilities = response.data?.metadata?.vulnerabilities || {};
    const result = severities.map(severity => ({
      severity,
      count: vulnerabilities[severity] || 0,
    }));

    // Extract detailed advisories if available
    const advisories = response.data?.advisories || {};
    if (Object.keys(advisories).length > 0) {
      // Create detailed report with additional info
      const detailedReport = Object.values(advisories).map(advisory => ({
        id: advisory.id,
        packageName: advisory.module_name,
        title: advisory.title,
        severity: advisory.severity,
        vulnerableVersions: advisory.vulnerable_versions,
        recommendation: advisory.recommendation,
        url: advisory.url,
        cves: advisory.cves || [],
        cvss: advisory.cvss?.score,
        findings: advisory.findings?.map(f => ({ 
          version: f.version,
          paths: f.paths 
        })) || []
      }));
      
      // Add detailed report to the result
      result.detailedAdvisories = detailedReport;
      
      // Add actions recommended (e.g. upgrades)
      if (response.data?.actions && response.data.actions.length > 0) {
        result.recommendedActions = response.data.actions.map(action => ({
          action: action.action,
          module: action.module,
          target: action.target,
          isMajor: action.isMajor,
          resolves: action.resolves?.map(r => r.id) || []
        }));
      }
    }

    return result;
  } catch (error) {
    console.error('Error running npm audit:', error.message);
    return emptyResult;
  }
}

module.exports = {
  getLatestVersion,
  calculateRecommendedVersion,
  parseDependencies,
  determineStatus,
  auditDependencies,
};
