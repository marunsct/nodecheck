sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"
], function(MessageToast, MessageBox, BusyIndicator) {
    'use strict';
    
    return {
        /**
         * Fetch repositories from GitHub and update the database
         *
         * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
         * @param aSelectedContexts the selected contexts of the table rows.
         */
        onGetRepo: function(oContext, aSelectedContexts) {
            var that = this;
            BusyIndicator.show(0);
            
            try {
                // Get the OData model
                const oModel = that.getModel();
                if (!oModel) {
                    throw new Error("OData model not found");
                }
                
                // Create a function import call using the OData model (V4)
                // The path should include the operation name with empty parameter list
                const sPath = "/fetchRepositories";
                // Create a context binding with the action name
                const oContext = oModel.bindContext(sPath + "(...)");
                
                // Execute the action
                const oPromise = oContext.execute();
                
                // Handle the result
                oPromise.then(() => {
                    // Get the actual result from the bound context
                    const oResult = oContext.getBoundContext().getObject();
                    
                    // Extract repositories from the result
                    let aRepositories = [];
                    if (oResult && oResult.value) {
                        aRepositories = Array.isArray(oResult.value) ? oResult.value : [];
                    } else if (Array.isArray(oResult)) {
                        aRepositories = oResult;
                    }
                    
                    MessageToast.show(`Repository list refreshed (${aRepositories.length} items).`);
                    
                    // Refresh the list to show updated data
                    if (oContext && oContext.getModel) {
                        oContext.getModel().refresh();
                    }
                    
                    BusyIndicator.hide();
                }).catch((oError) => {
                    const sMessage = oError?.message || oError?.responseText || "Something went wrong. Please try again.";
                    MessageBox.error(sMessage);
                    BusyIndicator.hide();
                });
                
                return oPromise;
            } catch (error) {
                const sMessage = error?.message || error?.responseText || "Something went wrong. Please try again.";
                MessageBox.error(sMessage);
                BusyIndicator.hide();
                return Promise.reject(error);
            }
        },

        /**
         * Run audit analysis on selected repositories
         *
         * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
         * @param aSelectedContexts the selected contexts of the table rows.
         */
        onAudit: function(oContext, aSelectedContexts) {
            var that = this;
            
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                MessageToast.show("Select at least one repository to run an audit.");
                return;
            }

            BusyIndicator.show(0);

            try {
                const aRepositoryIds = aSelectedContexts
                    .map((oContext) => oContext?.getObject?.()?.ID)
                    .filter(Boolean);

                if (aRepositoryIds.length === 0) {
                    MessageToast.show("Select at least one repository to run an audit.");
                    return;
                }

                // Get the OData model
                const oModel = that.getModel();
                if (!oModel) {
                    throw new Error("OData model not found");
                }
                
                // Create a function import call using the OData model (V4)
                // For OData V4 actions we need to use a different approach
                // The path should include the operation name without parameters
                const sPath = "/analyzeRepositories";
                // Create a context binding with the action name and add parameters
                const oContext = oModel.bindContext(sPath + "(...)");
                
                // Set the parameters for the function import - must be an array
                oContext.setParameter("repositoryIds", aRepositoryIds);
                
                // Execute the action
                const oPromise = oContext.execute();
                
                // Handle the result
                oPromise.then(() => {
                    // Get the actual result from the bound context
                    const oResult = oContext.getBoundContext().getObject();
                    
                    // Extract message from the result
                    let sMessage = "Audit completed successfully.";
                    if (oResult) {
                        if (oResult.message) {
                            sMessage = oResult.message;
                        } else if (typeof oResult === 'string') {
                            sMessage = oResult;
                        }
                    }
                    
                    MessageToast.show(sMessage);
                    
                    // Refresh the list to show updated data
                    if (oContext && oContext.getModel) {
                        oContext.getModel().refresh();
                    }
                    
                    BusyIndicator.hide();
                }).catch((oError) => {
                    const sMessage = oError?.message || oError?.responseText || "Something went wrong. Please try again.";
                    MessageBox.error(sMessage);
                    BusyIndicator.hide();
                });
                
                return oPromise;
            } catch (error) {
                const sMessage = error?.message || error?.responseText || "Something went wrong. Please try again.";
                MessageBox.error(sMessage);
                BusyIndicator.hide();
                return Promise.reject(error);
            }
        },
        
        /**
         * Get the OData model
         * @returns {sap.ui.model.odata.v4.ODataModel} The OData model
         */
        getModel: function() {
            // Get the model
            let oModel = null;
            
            // First try to get model from the view if available
            if (this.base && this.base.getView && this.base.getView().getModel) {
                oModel = this.base.getView().getModel();
            }
            
            // Try to get model from component if not found
            if (!oModel) {
                const oComponent = sap.ui.core.Component.getOwnerComponentFor(this.base);
                if (oComponent && oComponent.getModel) {
                    oModel = oComponent.getModel();
                }
            }
            
            // As a fallback, try to get the default model from core
            if (!oModel) {
                oModel = sap.ui.getCore().getModel();
            }
            
            return oModel;
        }
    };
});