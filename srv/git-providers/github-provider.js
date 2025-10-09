const { Octokit } = require('octokit');

class GitHubProvider {
  constructor(token) {
    this.octokit = new Octokit({ auth: token });
    this.provider = 'github';
  }

  /**
   * List all repositories accessible to the authenticated user
   */
  async listRepos() {
    try {
      const response = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
      });

      return response.data.map(repo => ({
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        provider: this.provider,
        defaultBranch: repo.default_branch,
      }));
    } catch (error) {
      console.error('Error fetching repositories from GitHub:', error.message);
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  /**
   * Get file content from a repository
   */
  async getFile(owner, repo, path, ref = null) {
    try {
      const params = {
        owner,
        repo,
        path,
      };
      
      if (ref) {
        params.ref = ref;
      }

      const response = await this.octokit.rest.repos.getContent(params);
      
      if (response.data.type !== 'file') {
        throw new Error(`${path} is not a file`);
      }

      // Decode base64 content
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return content;
    } catch (error) {
      console.error(`Error fetching file ${path} from ${owner}/${repo}:`, error.message);
      throw new Error(`Failed to fetch file: ${error.message}`);
    }
  }

  /**
   * Create a commit to update package.json
   */
  async createCommit(owner, repo, branch, filePath, content, message) {
    try {
      // Get the current file SHA
      const { data: currentFile } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch,
      });

      // Update the file
      const response = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message,
        content: Buffer.from(content).toString('base64'),
        sha: currentFile.sha,
        branch,
      });

      return {
        success: true,
        commitUrl: response.data.commit.html_url,
        sha: response.data.commit.sha,
      };
    } catch (error) {
      console.error(`Error creating commit in ${owner}/${repo}:`, error.message);
      throw new Error(`Failed to create commit: ${error.message}`);
    }
  }
}

module.exports = GitHubProvider;
