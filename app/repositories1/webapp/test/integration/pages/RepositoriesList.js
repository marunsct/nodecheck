sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'nodecheck.repositories1',
            componentId: 'RepositoriesList',
            contextPath: '/Repositories'
        },
        CustomPageDefinitions
    );
});