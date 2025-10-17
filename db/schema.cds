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
  advisories      : Composition of many SecurityAdvisories on advisories.auditResult = $self;
}

entity SecurityAdvisories : cuid, managed {
  auditResult         : Association to AuditResults;
  packageName         : String(255);
  advisoryId          : String(50);
  title               : String(500);
  severity            : String(20);
  vulnerableVersions  : String(255);
  recommendation      : String(500);
  url                 : String(1000);
  cves                : String(500);  // JSON array as string
  cvssScore           : Decimal(3,1);
  findings            : Composition of many AdvisoryFindings on findings.advisory = $self;
  actions             : Composition of many AdvisoryActions on actions.advisory = $self;
}

entity AdvisoryFindings : cuid {
  advisory            : Association to SecurityAdvisories;
  version             : String(50);
  paths               : String(1000);  // JSON array as string
}

entity AdvisoryActions : cuid {
  advisory            : Association to SecurityAdvisories;
  action              : String(50);  // install, remove, etc.
  module              : String(255);
  target              : String(50);
  isMajor             : Boolean;
  resolves            : String(500);  // JSON array as string
}
