# NodeCheck Usage Guide

A step-by-step guide to using NodeCheck for analyzing and managing Node.js dependencies in your repositories.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Starting the Application](#starting-the-application)
3. [Fetching Repositories](#fetching-repositories)
4. [Analyzing Dependencies](#analyzing-dependencies)
5. [Viewing Results](#viewing-results)
6. [Upgrading Packages](#upgrading-packages)
7. [Understanding Status Indicators](#understanding-status-indicators)
8. [Troubleshooting](#troubleshooting)

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure GitHub Authentication

Create a GitHub Personal Access Token:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name (e.g., "NodeCheck")
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. Copy the token (you won't see it again!)

Configure your environment:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your token
echo "GITHUB_TOKEN=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" > .env
```

### 3. Initialize Database

```bash
npm run deploy
```

This creates the SQLite database with the required tables.

## Starting the Application

Start the development server:

```bash
npm run watch
```

The application will be available at:
- **Web UI**: http://localhost:4004/
- **OData Service**: http://localhost:4004/odata/v4/repository

## Fetching Repositories

### Option 1: Using the UI

1. Open http://localhost:4004/ in your browser
2. Click on "Repository Manager" tile
3. Click the "Fetch Repositories" action (if available in UI)

### Option 2: Using the API

```bash
curl -X POST http://localhost:4004/odata/v4/repository/fetchRepositories
```

This will:
- Connect to GitHub with your token
- Fetch all repositories you have access to
- Store them in the database

**Expected Response:**
```json
[
  {
    "name": "my-app",
    "fullName": "username/my-app",
    "url": "https://github.com/username/my-app",
    "provider": "github"
  }
]
```

## Analyzing Dependencies

Once you have repositories, you can analyze their dependencies.

### Get Repository ID

First, get the repository ID:

```bash
curl http://localhost:4004/odata/v4/repository/Repositories
```

Copy the `ID` field from the repository you want to analyze.

### Run Analysis

```bash
curl -X POST http://localhost:4004/odata/v4/repository/analyzeRepositories \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryIds": ["your-repo-id-here"]
  }'
```

This will:
1. Fetch `package.json` from the repository
2. Parse all dependencies
3. Query npm registry for latest versions
4. Calculate recommended versions (1 minor behind latest)
5. Run security audit (currently mocked)
6. Update repository status (🔴🟡🟢)

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully analyzed 1 out of 1 repositories"
}
```

## Viewing Results

### View All Repositories

```bash
curl http://localhost:4004/odata/v4/repository/Repositories
```

### View Repository with Details

```bash
curl "http://localhost:4004/odata/v4/repository/Repositories(REPO_ID)?$expand=dependencies,auditResults"
```

Replace `REPO_ID` with the actual UUID.

### Example Output

```json
{
  "ID": "abc-123",
  "name": "my-app",
  "fullName": "username/my-app",
  "status": "yellow",
  "lastAnalyzed": "2024-10-09T14:00:00Z",
  "dependencies": [
    {
      "packageName": "express",
      "currentVersion": "4.17.1",
      "latestVersion": "4.18.2",
      "recommendedVersion": "4.17.0",
      "vulnerabilities": 0
    },
    {
      "packageName": "axios",
      "currentVersion": "0.21.1",
      "latestVersion": "1.6.0",
      "recommendedVersion": "1.5.0",
      "vulnerabilities": 2
    }
  ],
  "auditResults": [
    {
      "severity": "moderate",
      "count": 2,
      "timestamp": "2024-10-09T14:00:00Z"
    }
  ]
}
```

## Upgrading Packages

To upgrade packages to their recommended versions:

```bash
curl -X POST http://localhost:4004/odata/v4/repository/upgradePackages \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryId": "your-repo-id",
    "packageNames": ["express", "axios"]
  }'
```

This will:
1. Fetch the current `package.json`
2. Update specified packages to recommended versions
3. Create a commit in the repository
4. Return the commit URL

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully upgraded 2 package(s)",
  "commitUrl": "https://github.com/username/my-app/commit/abc123"
}
```

The commit message will be:
```
chore: upgrade 2 package(s) to recommended versions
```

## Understanding Status Indicators

Repositories are assigned status colors based on vulnerability severity:

| Status | Color | Meaning |
|--------|-------|---------|
| 🔴 Red | Critical | High or critical severity vulnerabilities detected |
| 🟡 Yellow | Warning | Moderate severity vulnerabilities detected |
| 🟢 Green | Healthy | No vulnerabilities or only low severity issues |

### Severity Levels

- **Critical**: Immediate action required
- **High**: Should be addressed soon
- **Moderate**: Plan to address in upcoming releases
- **Low**: Nice to fix when convenient
- **Info**: Informational only

## Recommended Version Logic

NodeCheck calculates a **recommended version** that is:
- 1 minor version behind the latest stable version
- More conservative than always using latest
- Reduces breaking change risk

**Examples:**

| Current | Latest | Recommended | Reason |
|---------|--------|-------------|--------|
| 4.17.1 | 4.19.2 | 4.18.0 | 1 minor behind |
| 2.0.5 | 3.2.1 | 3.1.0 | 1 minor behind |
| 1.0.5 | 1.0.8 | 1.0.8 | Minor already at 0 |

## Troubleshooting

### No Repositories Showing Up

**Problem:** `fetchRepositories` returns empty array

**Solutions:**
1. Verify GitHub token is correct in `.env`
2. Check token has `repo` scope
3. Verify you have repositories on GitHub
4. Check server logs for errors

### Analysis Fails

**Problem:** `analyzeRepositories` returns error

**Solutions:**
1. Verify repository has a `package.json` file
2. Check `package.json` is valid JSON
3. Ensure repository is accessible with your token
4. Check npm registry is reachable

### Cannot Create Commits

**Problem:** `upgradePackages` fails to create commit

**Solutions:**
1. Verify token has write access to the repository
2. Check if repository is archived or read-only
3. Verify branch name is correct (default: 'main')
4. Check if repository uses a different default branch

### UI Not Loading

**Problem:** Blank page at http://localhost:4004/

**Solutions:**
1. Check if SAP UI5 CDN is accessible
2. Look for browser console errors
3. Try accessing OData service directly: http://localhost:4004/odata/v4/repository
4. Clear browser cache

### Service Test Script Errors

**Problem:** `npm run test:service` fails

**Solutions:**
1. Ensure server is running (`npm run watch`)
2. Check port 4004 is not in use
3. Verify axios is installed
4. Check for network connectivity

## Advanced Usage

### Batch Analysis

Analyze multiple repositories at once:

```bash
curl -X POST http://localhost:4004/odata/v4/repository/analyzeRepositories \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryIds": [
      "repo-id-1",
      "repo-id-2",
      "repo-id-3"
    ]
  }'
```

### Filtering Repositories

Get only repositories with issues:

```bash
curl "http://localhost:4004/odata/v4/repository/Repositories?$filter=status eq 'red' or status eq 'yellow'"
```

### Searching Dependencies

Find all repositories using a specific package:

```bash
curl "http://localhost:4004/odata/v4/repository/Dependencies?$filter=packageName eq 'express'&$expand=repository"
```

### Sorting Results

Get repositories by last analyzed date:

```bash
curl "http://localhost:4004/odata/v4/repository/Repositories?$orderby=lastAnalyzed desc"
```

## Next Steps

1. **Automate Analysis**: Set up a cron job to run analysis regularly
2. **CI/CD Integration**: Add NodeCheck checks to your pipeline
3. **Custom Reports**: Use the OData API to create custom dashboards
4. **Extend Providers**: Add support for GitLab or Bitbucket (see API.md)

## Getting Help

- Check the [README.md](README.md) for project overview
- Review [API.md](API.md) for detailed API documentation
- Run `npm run test:service` to verify your setup
- Check server logs for detailed error messages

## Contributing

Have ideas for improvements? We welcome:
- Bug reports and feature requests
- Documentation improvements
- Code contributions for new providers
- UI enhancements

Happy dependency managing! 🚀
