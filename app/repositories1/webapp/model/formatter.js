sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";

    return {
        /**
         * Format severity with color state
         * @param {string} severity - The severity level
         * @returns {string} - sap.ui.core.ValueState value
         */
        formatSeverity: function (severity) {
            if (!severity) return "None";
            
            switch (severity.toLowerCase()) {
                case "critical":
                    return "Error";
                case "high":
                    return "Error";
                case "moderate":
                    return "Warning";
                case "low":
                    return "Information";
                default:
                    return "None";
            }
        },

        /**
         * Format timestamp to readable date
         * @param {string} timestamp - ISO date string
         * @returns {string} - Formatted date
         */
        formatDate: function (timestamp) {
            if (!timestamp) return "";
            
            const dateFormat = DateFormat.getDateTimeInstance({
                style: "medium"
            });
            return dateFormat.format(new Date(timestamp));
        },

        /**
         * Format CVSS score with color
         * @param {number} score - CVSS score
         * @returns {object} - Object with text and state
         */
        formatCvssScore: function (score) {
            if (!score && score !== 0) return { text: "N/A", state: "None" };
            
            // Round to 1 decimal place
            const formattedScore = Math.round(score * 10) / 10;
            
            if (formattedScore >= 9.0) {
                return { text: formattedScore.toString(), state: "Error" };
            } else if (formattedScore >= 7.0) {
                return { text: formattedScore.toString(), state: "Error" };
            } else if (formattedScore >= 4.0) {
                return { text: formattedScore.toString(), state: "Warning" };
            } else {
                return { text: formattedScore.toString(), state: "Information" };
            }
        }
    };
});