# NodeCheck - Repository Dependency Analyzer

A SAP CAP-based fullstack application that connects to Git repositories (GitHub, GitLab, etc.), analyzes Node.js dependencies from `package.json`, runs security audits, and automates dependency upgrades through automated commits.

## Features

- 🔗 **Git Integration**: Connect to GitHub repositories (GitLab and Bitbucket support planned)
- 📊 **Dependency Analysis**: Analyze Node.js dependencies from package.json
- 🔒 **Security Audits**: Run npm audit and display vulnerability status
- 📈 **Version Management**: View current, latest, and recommended versions for all packages
- 🚀 **Automated Upgrades**: Upgrade packages and create commits automatically
- 🎨 **Fiori UI**: Modern SAP Fiori Elements interface

## Project Structure

File or Folder | Purpose
---------|----------
`app/` | Fiori Elements UI applications
`app/repositories/` | Repository management UI
`db/` | Domain models (Repositories, Dependencies, AuditResults)
`srv/` | Service implementations and business logic
`srv/git-providers/` | Git provider integrations (GitHub, GitLab, Bitbucket)
`srv/lib/` | Helper libraries for analysis and version management
`package.json` | Project metadata and configuration

## Getting Started

> 📖 **New to NodeCheck?** Check out the [comprehensive Usage Guide](USAGE.md) for step-by-step instructions!

### Quick Start

1. **Clone and install:**
   ```bash
   git clone <repo-url>
   cd nodecheck
   npm install
   ```

2. **Configure GitHub token:**
   ```bash
   cp .env.example .env
   # Edit .env and add your GitHub token
   ```

3. **Start the application:**
   ```bash
   npm run deploy  # Initialize database
   npm run watch   # Start server
   ```

4. **Open in browser:**
   - UI: http://localhost:4004/
   - Service: http://localhost:4004/odata/v4/repository

### Prerequisites

- Node.js 18.x or later
- npm 8.x or later
- GitHub Personal Access Token (for repository access)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure GitHub authentication:
   - Copy `.env.example` to `.env`
   - Add your GitHub personal access token to `.env`:
     ```
     GITHUB_TOKEN=your_github_personal_access_token
     ```
   - Get your token from: https://github.com/settings/tokens
   - Required scopes: `repo` (full control of private repositories)

4. Deploy the database:
   ```bash
   cds deploy --to sqlite
   ```

5. Start the application:
   ```bash
   cds watch
   ```

6. Open your browser at http://localhost:4004

## Usage

### 1. Fetch Repositories
- Use the `fetchRepositories` action to load your GitHub repositories
- Repositories will be stored in the database

### 2. Analyze Dependencies
- Select one or more repositories from the list
- Click "Analyze" to scan package.json files
- Status indicators (🔴🟡🟢) show security status:
  - 🔴 Red: Critical or high severity vulnerabilities
  - 🟡 Yellow: Moderate severity vulnerabilities
  - 🟢 Green: No vulnerabilities detected

### 3. View Details
- Click on a repository to see detailed dependency information
- View current versions, latest versions, and recommended versions
- Recommended version is 1 minor version behind the latest

### 4. Upgrade Packages
- Select packages to upgrade
- Click "Upgrade Node Modules" to create a commit with updated versions
- The commit will be created in the repository with the message "chore: upgrade X package(s) to recommended versions"

## Development

### Available Commands

- `cds watch` - Run development server with hot reload
- `cds deploy --to sqlite` - Initialize/reset database
- `cds build` - Build for production
- `npm run test` - Run tests (when implemented)

### Key Services

- **RepositoryService**: Main service for repository management
  - `fetchRepositories()`: Fetch repositories from GitHub
  - `analyzeRepositories(repositoryIds)`: Analyze selected repositories
  - `upgradePackages(repositoryId, packageNames)`: Upgrade packages

### Git Providers

Currently supported:
- ✅ GitHub (via Octokit)

Planned:
- ⏳ GitLab
- ⏳ Bitbucket

## Quick Reference

### API Endpoints

```bash
# Fetch repositories from GitHub
POST /odata/v4/repository/fetchRepositories

# Analyze dependencies
POST /odata/v4/repository/analyzeRepositories
Body: {"repositoryIds": ["uuid1", "uuid2"]}

# Upgrade packages
POST /odata/v4/repository/upgradePackages
Body: {"repositoryId": "uuid", "packageNames": ["pkg1", "pkg2"]}
```

### Status Indicators

- 🔴 **Red**: Critical or high severity vulnerabilities
- 🟡 **Yellow**: Moderate severity vulnerabilities
- 🟢 **Green**: No vulnerabilities detected

### Recommended Version

The recommended version is **1 minor version behind the latest** to reduce breaking change risk:
- Latest: `4.19.2` → Recommended: `4.18.0`

For detailed usage instructions, see [USAGE.md](USAGE.md).

## Architecture

### Backend
- **SAP CAP**: Node.js runtime with CDS
- **Database**: SQLite (development) / SAP HANA Cloud (production)
- **Git Integration**: Octokit for GitHub API

### Frontend
- **SAP Fiori Elements**: List Report and Object Page templates
- **UI5**: SAP UI5 framework

### Data Model
- **Repositories**: Git repositories with status tracking
- **Dependencies**: Package dependencies with version information
- **AuditResults**: Security audit results by severity

## Security

- GitHub tokens are read from environment variables
- Never commit `.env` file to version control
- OAuth tokens should be stored in user sessions (not database)
- All Git API calls include proper error handling

## Learn More

- [SAP Cloud Application Programming Model](https://cap.cloud.sap/docs/)
- [SAP Fiori Elements](https://ui5.sap.com/test-resources/sap/fe/demo/)
- [GitHub REST API](https://docs.github.com/en/rest)
- [npm Registry API](https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md)

## License

This project is provided as-is for educational and development purposes.
