sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "../model/formatter"
], function (ControllerExtension, formatter) {
    "use strict";

    return ControllerExtension.extend("nodecheck.repositories1.ext.controller.SecurityAdvisoriesExt", {
        formatter: formatter,

        /**
         * Override onInit to add event handlers
         */
        override: {
            onInit: function () {
                // Call the original onInit
                if (this.getBaseController().onInit) {
                    this.getBaseController().onInit.apply(this, arguments);
                }

                // Initialize custom code for security advisories
                this._initializeSecurityAdvisories();
            }
        },

        /**
         * Initialize security advisories handling
         * @private
         */
        _initializeSecurityAdvisories: function() {
            const oView = this.getView();
            
            // Get the component
            const oComponent = this.getOwnerComponent();
            
            // Get the event bus
            const oEventBus = oComponent.getEventBus ? oComponent.getEventBus() : 
                              sap.ui.getCore().getEventBus();
            
            // Subscribe to security advisory detail events
            oEventBus.subscribe("SecurityAdvisories", "showDetails", this.onShowAdvisoryDetails, this);
        },

        /**
         * Handle showing advisory details
         * @param {string} sChannel - Event channel
         * @param {string} sEvent - Event name
         * @param {object} oData - Event data with advisory ID
         */
        onShowAdvisoryDetails: function(sChannel, sEvent, oData) {
            if (!oData || !oData.advisoryId) return;
            
            // Navigate to external URL for advisory details
            const sUrl = `https://www.npmjs.com/advisories/${oData.advisoryId}`;
            sap.m.URLHelper.redirect(sUrl, true);
        },

        /**
         * Format JSON array string to readable text
         * @param {string} sJsonArray - JSON array as string
         * @returns {string} - Formatted text
         * @public
         */
        formatJsonArray: function(sJsonArray) {
            if (!sJsonArray) return "";
            
            try {
                const aArray = JSON.parse(sJsonArray);
                if (!Array.isArray(aArray) || aArray.length === 0) return "None";
                
                return aArray.join(", ");
            } catch (error) {
                return sJsonArray;
            }
        }
    });
});