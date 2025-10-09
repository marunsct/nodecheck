using { cuid, managed } from '@sap/cds/common';

namespace nodecheck;

entity Repositories : cuid, managed {
  name            : String(255) @mandatory;
  fullName        : String(255) @mandatory;  // owner/repo
  provider        : String(50) default 'github';  // github, gitlab, bitbucket
  url             : String(500);
  status          : String(20);  // green, yellow, red
  lastAnalyzed    : DateTime;
  auditResults    : Composition of many AuditResults on auditResults.repository = $self;
  dependencies    : Composition of many Dependencies on dependencies.repository = $self;
}

entity Dependencies : cuid, managed {
  repository          : Association to Repositories;
  packageName         : String(255) @mandatory;
  currentVersion      : String(50);
  latestVersion       : String(50);
  recommendedVersion  : String(50);  // 1 minor behind latest
  vulnerabilities     : Integer default 0;
}

entity AuditResults : cuid, managed {
  repository      : Association to Repositories;
  severity        : String(20);  // info, low, moderate, high, critical
  count           : Integer default 0;
  timestamp       : DateTime;
}
