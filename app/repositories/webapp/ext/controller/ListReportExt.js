sap.ui.define([
    'sap/ui/core/mvc/ControllerExtension',
    'sap/ui/core/BusyIndicator',
    'sap/m/MessageToast',
    'sap/m/MessageBox'
], function (ControllerExtension, BusyIndicator, MessageToast, MessageBox) {
    'use strict';

    return ControllerExtension.extend('nodecheck.repositories.ext.controller.ListReportExt', {
        metadata: {
            methods: {
                onGetRepositories: { public: true, final: true },
                onRunAudit: { public: true, final: true }
            }
        },

        onGetRepositories: async function () {
            BusyIndicator.show(0);

            try {
                const oResult = await this._postAction('/odata/v4/repository/fetchRepositories');
                const aRepositories = Array.isArray(oResult?.value) ? oResult.value : [];

                MessageToast.show(this._getText('msgFetchReposSuccess', aRepositories.length));
                await this._refreshList();
            } catch (error) {
                this._handleActionError(error);
            } finally {
                BusyIndicator.hide();
            }
        },

        onRunAudit: async function () {
            const oExtensionAPI = this._getExtensionAPI();
            const aSelectedContexts = oExtensionAPI?.getSelectedContexts ? oExtensionAPI.getSelectedContexts() : [];

            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                MessageToast.show(this._getText('msgRunAuditNoSelection'));
                return;
            }

            BusyIndicator.show(0);

            try {
                const aRepositoryIds = aSelectedContexts
                    .map((oContext) => oContext?.getObject?.()?.ID)
                    .filter(Boolean);

                if (aRepositoryIds.length === 0) {
                    MessageToast.show(this._getText('msgRunAuditNoSelection'));
                    return;
                }

                const oResult = await this._postAction('/odata/v4/repository/analyzeRepositories', {
                    repositoryIds: aRepositoryIds
                });
                const sMessage = oResult?.message || this._getText('msgRunAuditSuccessDefault');

                MessageToast.show(sMessage);
                await this._refreshList();
            } catch (error) {
                this._handleActionError(error);
            } finally {
                BusyIndicator.hide();
            }
        },

        _getModel: function () {
            return this.base.getView().getModel();
        },

        _getExtensionAPI: function () {
            return this.base?.getExtensionAPI ? this.base.getExtensionAPI() : null;
        },

        _postAction: async function (sPath, oPayload) {
            const sCsrfToken = await this._getCsrfToken();
            const sBody = oPayload ? JSON.stringify(oPayload) : '{}';
            const oResponse = await fetch(sPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-csrf-token': sCsrfToken
                },
                credentials: 'include',
                body: sBody
            });

            if (!oResponse.ok) {
                const sText = await oResponse.text();
                throw new Error(sText || oResponse.statusText);
            }

            const oResult = await oResponse.json();
            return oResult;
        },

        _getCsrfToken: async function () {
            if (this._sCsrfToken) {
                return this._sCsrfToken;
            }

            const oResponse = await fetch('/odata/v4/repository/', {
                method: 'GET',
                headers: {
                    'x-csrf-token': 'Fetch'
                },
                credentials: 'include'
            });

            if (!oResponse.ok) {
                throw new Error('Failed to obtain CSRF token');
            }

            this._sCsrfToken = oResponse.headers.get('x-csrf-token');
            if (!this._sCsrfToken) {
                throw new Error('CSRF token missing in response headers');
            }

            return this._sCsrfToken;
        },

        _refreshList: async function () {
            const oModel = this._getModel();
            if (oModel?.refresh) {
                oModel.refresh();
            }

            const oExtensionAPI = this._getExtensionAPI();
            if (oExtensionAPI?.refresh) {
                oExtensionAPI.refresh();
            }
        },

        _getText: function (sKey, vParams) {
            const oResourceBundle = this.base.getView().getModel('i18n')?.getResourceBundle();
            if (!oResourceBundle) {
                return sKey;
            }

            return oResourceBundle.getText(sKey, vParams);
        },

        _handleActionError: function (error) {
            const sMessage = error?.message || error?.responseText || this._getText('msgGenericError');
            MessageBox.error(sMessage);
        }
    });
});
