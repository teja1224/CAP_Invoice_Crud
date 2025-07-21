
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
], (Controller, Fragment, MessageToast, MessageBox) => {
    "use strict";

    return Controller.extend("ns.invoiceui.controller.View1", {
        onInit() {
            this.onRead();
        },

        onRead: function () {
            const oView = this.getView();
            const oModel = this.getOwnerComponent().getModel();

            oModel.read("/Invoices", {
                success: function (oData) {
                    //adding edit path
                    oData.results.forEach(item => {
                        item.editPath = `/Invoices(${item.ID})`;
                        const rawDate = new Date(item.date);
                        item.dateFormatted = rawDate.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        });
                    });
                    const oJSONModel = new sap.ui.model.json.JSONModel();
                    oJSONModel.setData(oData.results);
                    oView.setModel(oJSONModel, "Invoices")
                },
                error: function (oError) {
                    sap.m.MessageToast.show("Failed to load invoices");
                    console.error(oError);
                }
            })
        },

        onOpenCreateDialog: function () {

            const view = this.getView();

            if (!this.createDialog) {
                Fragment.load({
                    name: "ns.invoiceui.fragment.CreateInvoice",
                    controller: this
                }).then(function (oDialog) {
                    view.addDependent(oDialog);
                    this.clearDialogInput()
                    oDialog.open();
                    this.createDialog = oDialog;
                }.bind(this));
            } else {
                // this.clearDialogInput()
                this.createDialog.open();
            }
        },

        clearDialogInput: function () {
            sap.ui.getCore().byId("idInvoiceNumber").setValue("")
            sap.ui.getCore().byId("idDate").setValue("")
            sap.ui.getCore().byId("idAmount").setValue("")
        },

        onCreateSubmit: function () {
            const oDialog = this.createDialog;

            const payload = {
                invoiceNumber: sap.ui.getCore().byId("idInvoiceNumber").getValue(),
                date: sap.ui.getCore().byId("idDate").getValue(),
                amount: parseFloat(sap.ui.getCore().byId("idAmount").getValue()),
            };
            const oModel = this.getView().getModel()

            oModel.create("/Invoices", payload, {
                success: () => {
                    MessageToast.show("Invoice Created")
                    this.clearDialogInput()
                    oDialog.close();
                    // oModel.refresh();
                    this.onRead();
                },
                error: () => MessageToast.show("Invoice Creation Failed")
            });
        },

        onCreateCancel: function () {
            this.createDialog.close();
        },

        //Work on Update Invoice
        onOpenEditDialog: function (oEvent) {
            const oContext = oEvent.getSource().getParent().getBindingContext("Invoices");
            const data = oContext.getObject();
            this.editPath = data.editPath;

            const view = this.getView();
            if (!this.updateDialog) {
                Fragment.load({
                    name: "ns.invoiceui.fragment.UpdateInvoice",
                    controller: this
                }).then(function (oDialog) {
                    view.addDependent(oDialog);
                    this._bindUpdateFields(data);
                    oDialog.open();
                    this.updateDialog = oDialog;
                }.bind(this));
            } else {
                this._bindUpdateFields(data);
                this.updateDialog.open();
            }
        },

        _bindUpdateFields: function (data) {
            sap.ui.getCore().byId("updateInvoiceNumber").setValue(data.invoiceNumber || "");
            const rawDate = new Date(data.date);
            const formattedDate = rawDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
            });
            sap.ui.getCore().byId("updateDate").setValue(formattedDate || "");
            sap.ui.getCore().byId("updateAmount").setValue(data.amount || "");
        },

        onUpdateSubmit: function () {
            const payload = {
                invoiceNumber: sap.ui.getCore().byId("updateInvoiceNumber").getValue(),
                date: sap.ui.getCore().byId("updateDate").getValue(),
                amount: parseFloat(sap.ui.getCore().byId("updateAmount").getValue())
            };
            const oModel = this.getView().getModel();

            oModel.update(this.editPath, payload, {
                success: () => {
                    MessageToast.show("Inovice Updated");
                    // oModel.refresh();
                    this.onRead();
                    this.updateDialog.close();
                },
                error: (err) => {
                    MessageToast.show("Update Failed")
                }
            })
        },

        onUpdateCancel: function () {
            this.updateDialog.close();
        },

        onDelete: function (oEvent) {
            const oContext = oEvent.getSource().getParent().getBindingContext("Invoices");
            const data = oContext.getObject();
            const sPath = data.editPath
            const oModel = this.getView().getModel();
            const that = this;
            MessageBox.confirm("Are you sure you want to delete this invoice?", {
                title: "Confirm Deletion",
                onClose: function (oAction) {
                    if (oAction === "OK") {
                        oModel.remove(sPath, {
                            success: function () {
                                MessageToast.show("Invoice deleted");
                                // oModel.refresh();
                                that.onRead();
                            },
                            error: function () {
                                MessageToast.show("Delete failed");
                            }
                        });
                    }
                }
            });
        }


    });
});