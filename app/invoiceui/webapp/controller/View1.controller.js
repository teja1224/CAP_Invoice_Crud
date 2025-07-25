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

        onRead: function (statusFilter, searchValue) {
            const oView = this.getView();
            const oModel = this.getOwnerComponent().getModel();
            const mParameters = {
                success: function (oData) {
                    oData.results.forEach(item => {
                        item.editPath = `/Invoices(${item.ID})`;
                        const rawDate = new Date(item.date);
                        item.dateFormatted = rawDate.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        });
                    });
                    oData.results.sort((a, b) => new Date(b.date) - new Date(a.date));
                    const oJSONModel = new sap.ui.model.json.JSONModel();
                    oJSONModel.setData(oData.results);
                    oView.setModel(oJSONModel, "AllInvoices");

                    const visibleModel = new sap.ui.model.json.JSONModel(oData.results);
                    
                    oView.setModel(visibleModel, "Invoices");
                },
                error: function (oError) {
                    MessageToast.show("Failed to load invoices");
                    console.error(oError);
                }
            };

            // const allfilters = []
        
            // if (statusFilter) {
            //     allfilters.push(new sap.ui.model.Filter("status", "EQ", statusFilter));
            // }
            // if (searchValue){
            //     allfilters.push(new sap.ui.model.Filter("invoiceNumber", "Contains", searchValue))
            // }
            // if(allfilters.length>0){
            //     mParameters.filters = [new sap.ui.model.Filter({ filters: allfilters, and:true})];
            // }
        
            oModel.read("/Invoices", mParameters);
        },

        clientfilter: function(selectedStatus,searchValue){
            const oView = this.getView();
            const allInvoices = oView.getModel("AllInvoices").getData()
            let filteredInc = allInvoices;

            if (selectedStatus){
                filteredInc = filteredInc.filter(item => item.status===selectedStatus);
            }
            if (searchValue) {
                const query = searchValue.toLowerCase()
                filteredInc = filteredInc.filter(item => item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(query))
            }

            filteredInc.sort((a, b) => new Date(b.date) - new Date(a.date));
            const filteredModel = new sap.ui.model.json.JSONModel(filteredInc)
            oView.setModel(filteredModel, "Invoices")
        }, 
        

        onStatusFilter: function (oEvent) {
            const selectedStatus = oEvent.getSource().getSelectedKey();
            const searchValue = this.byId("invoiceSearch").getValue();
            this.clientfilter(selectedStatus,searchValue);
        },

        onInvoiceSearch: function(oEvent){
            const searchValue = oEvent.getSource().getValue();
            const statusValue = this.byId("statusFilter").getSelectedKey();
            this.clientfilter(statusValue, searchValue)
        },

        onClearFilters: function(){
            this.byId("invoiceSearch").setValue("");
            this.byId("statusFilter").setSelectedKey("");
            this.clientfilter()
        },

        formatDateToLocal: function(dateObj) {
            const year = dateObj.getFullYear();
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const day = dateObj.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
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
            sap.ui.getCore().byId("idDescription").setValue("");
            sap.ui.getCore().byId("idStatus").setSelectedKey("Pending");
        },

        onCreateSubmit: function () {
            const oDialog = this.createDialog;

            const payload = {
                invoiceNumber: sap.ui.getCore().byId("idInvoiceNumber").getValue(),
                date: sap.ui.getCore().byId("idDate").getValue(),
                amount: parseFloat(sap.ui.getCore().byId("idAmount").getValue()),
                description: sap.ui.getCore().byId("idDescription").getValue(),
                status: sap.ui.getCore().byId("idStatus").getSelectedKey()
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
                error: (oError) => {
                    let message = "Create failed";
    
                    if (oError && oError.responseText) {
                        try {
                            const errorObj = JSON.parse(oError.responseText);
                            message = errorObj.error.message.value || message;
                        } catch (e) {
                        }
                    }
        
                    MessageBox.error(message);
                    this.clearDialogInput()
                }
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
            if (data.date) {
                sap.ui.getCore().byId("updateDate").setDateValue(new Date(data.date));
            } else {
                sap.ui.getCore().byId("updateDate").setValue("");
            }
            sap.ui.getCore().byId("updateAmount").setValue(data.amount || "");
            sap.ui.getCore().byId("updateDescription").setValue(data.description || "");
            sap.ui.getCore().byId("updateStatus").setSelectedKey(data.status || "Pending");
        },

        onUpdateSubmit: function () {
            const dateObj = sap.ui.getCore().byId("updateDate").getDateValue();
            const payload = {
                invoiceNumber: sap.ui.getCore().byId("updateInvoiceNumber").getValue(),
                date: this.formatDateToLocal(dateObj),
                amount: parseFloat(sap.ui.getCore().byId("updateAmount").getValue()),
                description: sap.ui.getCore().byId("updateDescription").getValue(),
                status: sap.ui.getCore().byId("updateStatus").getSelectedKey()
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