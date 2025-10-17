using { nodecheck } from '../db/schema';

service RepositoryService {

  // Repository entity with all compositions
  entity Repositories as projection on nodecheck.Repositories;
  
  // Dependencies entity for detailed view
  entity Dependencies as projection on nodecheck.Dependencies;
  
  // Audit results with detailed security advisories
  entity AuditResults as projection on nodecheck.AuditResults;
  entity SecurityAdvisories as projection on nodecheck.SecurityAdvisories;
  entity AdvisoryFindings as projection on nodecheck.AdvisoryFindings;
  entity AdvisoryActions as projection on nodecheck.AdvisoryActions;

  // Action to fetch repositories from GitHub
  action fetchRepositories() returns array of {
    name: String;
    fullName: String;
    url: String;
    provider: String;
  };

  // Action to analyze selected repositories
  action analyzeRepositories(repositoryIds: array of String) returns {
    success: Boolean;
    message: String;
  };

  // Action to upgrade packages in a repository
  action upgradePackages(repositoryId: String, packageNames: array of String) returns {
    success: Boolean;
    message: String;
    commitUrl: String;
  };
}
