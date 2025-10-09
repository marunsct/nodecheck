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
  // For now, return a mock audit result
  // In production, this would run npm audit via child_process
  return [
    { severity: 'info', count: 0 },
    { severity: 'low', count: 0 },
    { severity: 'moderate', count: 0 },
    { severity: 'high', count: 0 },
    { severity: 'critical', count: 0 },
  ];
}

module.exports = {
  getLatestVersion,
  calculateRecommendedVersion,
  parseDependencies,
  determineStatus,
  auditDependencies,
};
