const GitHubProvider = require('./github-provider');

class GitProviderFactory {
  /**
   * Get a git provider instance based on the type
   * @param {string} type - Provider type (github, gitlab, bitbucket)
   * @param {string} token - Authentication token
   */
  static getProvider(type, token) {
    switch (type.toLowerCase()) {
      case 'github':
        return new GitHubProvider(token);
      // Add other providers here in future phases
      // case 'gitlab':
      //   return new GitLabProvider(token);
      // case 'bitbucket':
      //   return new BitbucketProvider(token);
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }
}

module.exports = GitProviderFactory;
