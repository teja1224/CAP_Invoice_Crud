sap.ui.define([
    "sap/ui/core/format/DateFormat"
  ], function (DateFormat) {
    "use strict";
  
    return {
      formatPrettyDate: function (value) {
        if (!value) return "";
        const oDate = new Date(value);
        const oDateFormat = DateFormat.getDateInstance({ pattern: "MMM dd, yyyy" });
        return oDateFormat.format(oDate);
      }
    };
  });
  