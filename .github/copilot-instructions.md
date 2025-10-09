# NodeCheck - CAP Fullstack Node.js Dependency Analyzer

## Project Overview
A SAP CAP-based fullstack application that connects to Git repositories (GitHub, GitLab, etc.), analyzes Node.js dependencies from `package.json`, runs security audits, and automates dependency upgrades through automated commits.

## Architecture

### Technology Stack
- **Backend**: SAP CAP (Node.js runtime with CDS)
- **Frontend**: SAP Fiori Elements / UI5
- **Database**: SQLite (dev) / SAP HANA Cloud (prod)
- **Git Integration**: Octokit (GitHub), GitLab API, Bitbucket API
- **Package Analysis**: npm CLI, npm Registry API, npm-check-updates

### Core Components
1. **Git Provider Service** - OAuth integration with GitHub/GitLab/Bitbucket
2. **Repository Service** - Fetch and list accessible repositories
3. **Analysis Service** - Parse package.json, run `npm audit`, compare versions
4. **Upgrade Service** - Modify package.json, create commits via Git API
5. **UI** - Repository list, analysis dashboard, detail view with upgrade actions

## Data Model (CDS Schema)

```cds
// srv/schema.cds
entity Repositories {
  key ID          : UUID;
  name            : String;
  fullName        : String;  // owner/repo
  provider        : String;  // github, gitlab, bitbucket
  url             : String;
  status          : String;  // green, yellow, red
  lastAnalyzed    : DateTime;
  auditResult     : Composition of many AuditResults on auditResult.repository = $self;
  dependencies    : Composition of many Dependencies on dependencies.repository = $self;
}

entity Dependencies {
  key ID              : UUID;
  repository          : Association to Repositories;
  packageName         : String;
  currentVersion      : String;
  latestVersion       : String;
  recommendedVersion  : String;  // 1 minor behind latest
  vulnerabilities     : Integer;
}

entity AuditResults {
  key ID          : UUID;
  repository      : Association to Repositories;
  severity        : String;  // info, low, moderate, high, critical
  count           : Integer;
  timestamp       : DateTime;
}
```

## Service Implementation

### Git Provider Integration
```javascript
// srv/git-service.js
// Support multiple providers with strategy pattern
class GitProviderFactory {
  static getProvider(type) {
    switch(type) {
      case 'github': return new GitHubProvider();
      case 'gitlab': return new GitLabProvider();
      case 'bitbucket': return new BitbucketProvider();
    }
  }
}

// Each provider implements: listRepos(), getFile(), createCommit()
```

### Analysis Workflow
1. Fetch `package.json` from repository via Git API
2. Parse dependencies and devDependencies
3. Run `npm audit --json` via child_process
4. Query npm registry for latest versions: `https://registry.npmjs.org/{package}/latest`
5. Calculate recommended version (subtract 1 from minor in latest)
6. Determine status: RED (critical vulns), YELLOW (moderate), GREEN (clean)

### Upgrade Implementation
```javascript
// srv/upgrade-service.js
async function upgradePackages(repoId, packageNames) {
  // 1. Clone or fetch package.json
  // 2. Update versions to recommended
  // 3. Create commit via Git API with message: "chore: upgrade dependencies"
  // 4. Use authenticated user token for commit
}
```

## UI Structure

### Repository List View
- Table with columns: Repository, Provider, Status (🔴🟡🟢), Last Analyzed
- Multi-select enabled
- "Analyze Selected" button triggers batch analysis

### Repository Detail (Object Page)
- Header: Repo name, status, last analyzed timestamp
- Table: Package Name | Current | Latest | Recommended | Vulnerabilities
- "Upgrade Node Modules" button (batch action)

## Development Workflow

### Initial Setup
```bash
# Initialize CAP project
npm install -g @sap/cds-dk
cds init nodecheck --add samples
cd nodecheck

# Install dependencies
npm install octokit @gitbeaker/node axios npm-check-updates

# Development
cds watch
```

### Key Commands
- `cds watch` - Run dev server with hot reload
- `cds deploy --to sqlite` - Initialize database
- `npm run test` - Run Jest tests
- `cds build` - Build for production

### Environment Configuration
```bash
# .env file
GITHUB_CLIENT_ID=your_github_oauth_app_id
GITHUB_CLIENT_SECRET=your_secret
GITLAB_TOKEN=your_gitlab_token
NPM_REGISTRY_URL=https://registry.npmjs.org
```

## Critical Patterns

### Error Handling
- Wrap all Git API calls in try-catch with proper error responses
- Handle rate limits (GitHub: 5000/hour authenticated)
- Cache package.json content to reduce API calls

### Security
- Store OAuth tokens in CAP user session, never in database
- Validate package.json JSON before parsing
- Sanitize commit messages to prevent injection

### Performance
- Batch npm registry queries (max 50 concurrent)
- Use npm registry bulk API when available
- Implement job queue for analysis (don't block UI)

## Testing Strategy
```javascript
// test/analysis-service.test.js
describe('AnalysisService', () => {
  test('should determine status from audit results', () => {
    const result = { critical: 2, high: 0 };
    expect(getStatus(result)).toBe('red');
  });
  
  test('should calculate recommended version', () => {
    expect(getRecommended('2.5.3')).toBe('2.4.0');
  });
});
```

## Implementation Phases

### Phase 1: GitHub Integration & Basic Analysis
- OAuth flow with GitHub
- List repositories from authenticated user
- Fetch and parse package.json
- Run npm audit and display results

### Phase 2: Multi-Provider Support
- Add GitLab and Bitbucket providers
- Abstract Git operations behind interface
- Provider selection in UI

### Phase 3: Version Analysis & UI
- Fetch latest versions from npm registry
- Calculate recommended versions
- Build Fiori Elements object page
- Status indicators (red/yellow/green)

### Phase 4: Automated Upgrades
- Update package.json content
- Create commits via Git API
- Handle authentication and permissions
- Success/failure notifications

## File Structure
```
nodecheck/
├── .github/
│   └── copilot-instructions.md
├── app/                    # UI5 frontend
│   └── repositories/       # Fiori Elements app
├── srv/
│   ├── schema.cds         # Data model
│   ├── repository-service.cds
│   ├── git-providers/     # GitHub, GitLab, Bitbucket
│   ├── analysis-service.js
│   └── upgrade-service.js
├── db/
│   └── schema.cds
├── test/
└── package.json
```

## Next Steps for AI Agent
1. Initialize CAP project structure with `cds init`
2. Define CDS entities for Repositories, Dependencies, AuditResults
3. Implement GitHubProvider with Octokit
4. Create analysis service with npm audit integration
5. Build Fiori Elements UI with list and object page
6. Implement upgrade service with Git commit functionality
7. Add OAuth authentication flow
8. Write unit tests for core services

---

**Note**: Start with GitHub-only implementation for MVP, then extend to other providers. Use personal GitHub repos for initial testing before production deployment.
