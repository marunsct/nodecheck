sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'nodecheck.repositories1',
            componentId: 'RepositoriesObjectPage',
            contextPath: '/Repositories'
        },
        CustomPageDefinitions
    );
});