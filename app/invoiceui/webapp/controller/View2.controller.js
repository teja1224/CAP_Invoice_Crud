sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast"
], function (Controller, History, MessageToast) {
    "use strict";

    return Controller.extend("ns.invoiceui.controller.View2", {
        onInit: function () {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("invoiceDetails").attachPatternMatched(this.onObjectMatched, this);
        },

        onObjectMatched: function (oEvent) {
            const invoiceId = oEvent.getParameter("arguments").invoiceId;
            const oModel = this.getOwnerComponent().getModel();

            oModel.read(`/Invoices(${invoiceId})`, {
                urlParameters: {
                    "$expand": "items"
                },
                success: (oData) => {
                    if (oData.date) {
                        const rawDate = new Date(oData.date);
                        oData.dateFormatted = rawDate.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        });
                    }

                    // Set invoice model
                    const oInvoiceModel = new sap.ui.model.json.JSONModel(oData);
                    this.getView().setModel(oInvoiceModel, "invoiceModel");

                    // Set items model
                    const oItemsModel = new sap.ui.model.json.JSONModel(oData.items?.results || []);
                    this.getView().setModel(oItemsModel, "itemsModel");
                },
                error: () => {
                    MessageToast.show("Failed to load invoice details");
                }
            });
        },

        onNavBack: function () {
            const oHistory = History.getInstance();
            const sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteView1", {}, true);
            }
        }
    });
});
