sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"nodecheck/repositories1/test/integration/pages/RepositoriesList",
	"nodecheck/repositories1/test/integration/pages/RepositoriesObjectPage"
], function (JourneyRunner, RepositoriesList, RepositoriesObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('nodecheck/repositories1') + '/test/flp.html#app-preview',
        pages: {
			onTheRepositoriesList: RepositoriesList,
			onTheRepositoriesObjectPage: RepositoriesObjectPage
        },
        async: true
    });

    return runner;
});

