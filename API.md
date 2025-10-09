# NodeCheck API Documentation

## Overview

NodeCheck provides a REST API for analyzing Node.js dependencies in Git repositories. The API is built on SAP CAP and follows OData v4 standards.

## Base URL

```
http://localhost:4004/odata/v4/repository
```

## Authentication

Currently using mock authentication for development. In production, configure GitHub OAuth:
- Set `GITHUB_TOKEN` in `.env` file
- Token scope required: `repo` (full control of private repositories)

## Entities

### Repositories

Main entity representing a Git repository.

**Fields:**
- `ID` (UUID): Unique identifier
- `name` (String): Repository name
- `fullName` (String): Full name (owner/repo)
- `provider` (String): Git provider (github, gitlab, bitbucket)
- `url` (String): Repository URL
- `status` (String): Analysis status (green, yellow, red)
- `lastAnalyzed` (DateTime): Last analysis timestamp
- `createdAt`, `modifiedAt` (DateTime): Audit fields

**Relationships:**
- `dependencies` (Composition): List of package dependencies
- `auditResults` (Composition): Security audit results

### Dependencies

Package dependencies found in package.json.

**Fields:**
- `ID` (UUID): Unique identifier
- `repository_ID` (UUID): Parent repository
- `packageName` (String): npm package name
- `currentVersion` (String): Current version in package.json
- `latestVersion` (String): Latest version from npm registry
- `recommendedVersion` (String): Recommended version (1 minor behind latest)
- `vulnerabilities` (Integer): Number of vulnerabilities

### AuditResults

Security audit results from npm audit.

**Fields:**
- `ID` (UUID): Unique identifier
- `repository_ID` (UUID): Parent repository
- `severity` (String): Severity level (info, low, moderate, high, critical)
- `count` (Integer): Number of vulnerabilities
- `timestamp` (DateTime): Audit timestamp

## Actions

### 1. Fetch Repositories

Fetch repositories from GitHub for the authenticated user.

**Endpoint:**
```
POST /odata/v4/repository/fetchRepositories
```

**Request Body:** None

**Response:**
```json
[
  {
    "name": "my-app",
    "fullName": "owner/my-app",
    "url": "https://github.com/owner/my-app",
    "provider": "github"
  }
]
```

**Example:**
```bash
curl -X POST http://localhost:4004/odata/v4/repository/fetchRepositories
```

### 2. Analyze Repositories

Analyze Node.js dependencies in selected repositories.

**Endpoint:**
```
POST /odata/v4/repository/analyzeRepositories
```

**Request Body:**
```json
{
  "repositoryIds": [
    "uuid-1",
    "uuid-2"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully analyzed 2 out of 2 repositories"
}
```

**Example:**
```bash
curl -X POST http://localhost:4004/odata/v4/repository/analyzeRepositories \
  -H "Content-Type: application/json" \
  -d '{"repositoryIds": ["abc-123"]}'
```

### 3. Upgrade Packages

Upgrade selected packages to recommended versions and create a commit.

**Endpoint:**
```
POST /odata/v4/repository/upgradePackages
```

**Request Body:**
```json
{
  "repositoryId": "uuid",
  "packageNames": [
    "express",
    "axios"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully upgraded 2 package(s)",
  "commitUrl": "https://github.com/owner/repo/commit/abc123"
}
```

**Example:**
```bash
curl -X POST http://localhost:4004/odata/v4/repository/upgradePackages \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryId": "abc-123",
    "packageNames": ["express", "axios"]
  }'
```

## Query Examples

### Get All Repositories

```bash
curl http://localhost:4004/odata/v4/repository/Repositories
```

### Get Repository with Dependencies

```bash
curl "http://localhost:4004/odata/v4/repository/Repositories(ID)?$expand=dependencies,auditResults"
```

### Filter Repositories by Status

```bash
# Get repositories with critical issues (red status)
curl "http://localhost:4004/odata/v4/repository/Repositories?$filter=status eq 'red'"
```

### Get Dependencies for a Repository

```bash
curl "http://localhost:4004/odata/v4/repository/Dependencies?$filter=repository_ID eq 'uuid'&$orderby=packageName"
```

### Search Packages

```bash
curl "http://localhost:4004/odata/v4/repository/Dependencies?$filter=contains(packageName,'express')"
```

## Status Codes

- **green**: No vulnerabilities or only low severity
- **yellow**: Moderate severity vulnerabilities detected
- **red**: High or critical severity vulnerabilities detected

## Version Calculation

**Recommended Version Logic:**
- Latest version: `2.5.3`
- Recommended version: `2.4.0` (1 minor version behind)

If latest version has minor = 0 (e.g., `1.0.5`), recommended = latest.

## Error Handling

All errors return appropriate HTTP status codes:

- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid GitHub token
- `404 Not Found`: Repository or resource not found
- `500 Internal Server Error`: Server-side error

**Error Response Format:**
```json
{
  "error": {
    "code": "400",
    "message": "No repositories selected for analysis"
  }
}
```

## Rate Limits

GitHub API rate limits apply:
- **Authenticated**: 5,000 requests/hour
- **Unauthenticated**: 60 requests/hour

npm Registry API has no strict rate limits but uses best practices:
- Maximum 50 concurrent requests
- Requests timeout after 5 seconds

## Development Testing

Use the included test script:

```bash
npm run test:service
```

Or test manually with curl:

```bash
# Check service health
curl http://localhost:4004/odata/v4/repository

# Fetch repositories
curl -X POST http://localhost:4004/odata/v4/repository/fetchRepositories

# List repositories
curl http://localhost:4004/odata/v4/repository/Repositories
```

## Future Enhancements

- [ ] GitLab and Bitbucket provider support
- [ ] Real npm audit integration (currently mocked)
- [ ] OAuth authentication flow
- [ ] Webhook support for automatic analysis
- [ ] Batch operations for better performance
- [ ] Custom actions in Fiori UI
