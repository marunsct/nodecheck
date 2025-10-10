using { RepositoryService } from '../../srv/repository-service';

annotate RepositoryService.Repositories with @(
    UI: {
        SelectionFields: [
            name,
            provider,
            status
        ],
        LineItem: [
            {
                Value: name,
                Label: 'Repository Name'
            },
            {
                Value: fullName,
                Label: 'Full Name'
            },
            {
                Value: provider,
                Label: 'Provider'
            },
            {
                Value: status,
                Label: 'Status',
                Criticality: status,
                CriticalityRepresentation: #WithIcon
            },
            {
                Value: lastAnalyzed,
                Label: 'Last Analyzed'
            }
        ],
        HeaderInfo: {
            TypeName: 'Repository',
            TypeNamePlural: 'Repositories',
            Title: { Value: fullName },
            Description: { Value: name }
        },
        Facets: [
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'Repository Details',
                Target: '@UI.FieldGroup#Details'
            },
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'Dependencies',
                Target: 'dependencies/@UI.LineItem'
            },
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'Audit Results',
                Target: 'auditResults/@UI.LineItem'
            }
        ],
        FieldGroup#Details: {
            Data: [
                { Value: name, Label: 'Name' },
                { Value: fullName, Label: 'Full Name' },
                { Value: provider, Label: 'Provider' },
                { Value: url, Label: 'URL' },
                { Value: status, Label: 'Status' },
                { Value: lastAnalyzed, Label: 'Last Analyzed' }
            ]
        }
    }
);

annotate RepositoryService.Dependencies with @(
    UI: {
        LineItem: [
            {
                Value: packageName,
                Label: 'Package Name'
            },
            {
                Value: currentVersion,
                Label: 'Current Version'
            },
            {
                Value: latestVersion,
                Label: 'Latest Version'
            },
            {
                Value: recommendedVersion,
                Label: 'Recommended Version'
            },
            {
                Value: vulnerabilities,
                Label: 'Vulnerabilities',
                Criticality: vulnerabilities
            }
        ]
    }
);

annotate RepositoryService.AuditResults with @(
    UI: {
        LineItem: [
            {
                Value: severity,
                Label: 'Severity'
            },
            {
                Value: count,
                Label: 'Count'
            },
            {
                Value: timestamp,
                Label: 'Timestamp'
            }
        ]
    }
);

// Status criticality mapping
annotate RepositoryService.Repositories with {
    status @(
        Common: {
            ValueList: {
                CollectionPath: 'Repositories',
                Parameters: [
                    {
                        $Type: 'Common.ValueListParameterInOut',
                        LocalDataProperty: status,
                        ValueListProperty: 'status'
                    }
                ]
            }
        }
    );
};
