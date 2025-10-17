using RepositoryService as service from '../../srv/repository-service';

// Annotations for security advisories
annotate service.SecurityAdvisories with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Security Advisory',
      TypeNamePlural: 'Security Advisories',
      Title: { Value: title },
      Description: { Value: packageName }
    },
    LineItem: [
      { Value: packageName, Label: 'Package' },
      { Value: severity, Label: 'Severity', 
        Criticality: {
          $Type: 'UI.CriticalityType',
          $EnumMember: '{= %{severity} === "critical" ? "UI.CriticalityType/Critical" : 
                        %{severity} === "high" ? "UI.CriticalityType/Negative" :
                        %{severity} === "moderate" ? "UI.CriticalityType/Critical" :
                        "UI.CriticalityType/Information" }'
        }
      },
      { Value: title, Label: 'Title' },
      { Value: recommendation, Label: 'Recommendation' },
      { Value: cvssScore, Label: 'CVSS Score' }
    ],
    Facets: [
      {
        $Type: 'UI.ReferenceFacet',
        Label: 'Advisory Details',
        Target: '@UI.FieldGroup#AdvisoryDetails'
      },
      {
        $Type: 'UI.ReferenceFacet',
        Label: 'Findings',
        Target: 'findings/@UI.LineItem'
      },
      {
        $Type: 'UI.ReferenceFacet',
        Label: 'Recommended Actions',
        Target: 'actions/@UI.LineItem'
      }
    ],
    FieldGroup#AdvisoryDetails: {
      Data: [
        { Value: packageName, Label: 'Package' },
        { Value: severity, Label: 'Severity' },
        { Value: title, Label: 'Title' },
        { Value: advisoryId, Label: 'Advisory ID' },
        { Value: vulnerableVersions, Label: 'Vulnerable Versions' },
        { Value: recommendation, Label: 'Recommendation' },
        { Value: url, Label: 'URL', 
          @UI.IsUrl: true
        },
        { Value: cves, Label: 'CVEs' },
        { Value: cvssScore, Label: 'CVSS Score' }
      ]
    }
  }
);

// Annotations for advisory findings
annotate service.AdvisoryFindings with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Finding',
      TypeNamePlural: 'Findings',
      Title: { Value: version }
    },
    LineItem: [
      { Value: version, Label: 'Version' },
      { Value: paths, Label: 'Affected Paths' }
    ]
  }
);

// Annotations for advisory actions
annotate service.AdvisoryActions with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Action',
      TypeNamePlural: 'Actions',
      Title: { Value: module }
    },
    LineItem: [
      { Value: action, Label: 'Action' },
      { Value: module, Label: 'Package' },
      { Value: target, Label: 'Target Version' },
      { Value: isMajor, Label: 'Major Update' },
      { Value: resolves, Label: 'Resolves' }
    ]
  }
);

// Update AuditResults annotations to link to Security Advisories
annotate service.AuditResults with @(
  UI: {
    LineItem: [
      { Value: severity, Label: 'Severity',
        Criticality: {
          $Type: 'UI.CriticalityType',
          $EnumMember: '{= %{severity} === "critical" ? "UI.CriticalityType/Critical" : 
                        %{severity} === "high" ? "UI.CriticalityType/Negative" :
                        %{severity} === "moderate" ? "UI.CriticalityType/Critical" :
                        "UI.CriticalityType/Information" }'
        }
      },
      { Value: count, Label: 'Count' },
      { Value: timestamp, Label: 'Timestamp' }
    ],
    Facets: [
      {
        $Type: 'UI.ReferenceFacet',
        Label: 'Security Advisories',
        Target: 'advisories/@UI.LineItem'
      }
    ]
  }
);