sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], function (Controller, History, MessageToast,MessageBox, Fragment) {
    "use strict";

    return Controller.extend("ns.invoiceui.controller.View2", {

        onInit() {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("invoiceDetails").attachPatternMatched(this.onObjectMatched, this);
        },
        onObjectMatched: function (oEvent) {
            const invoiceId = oEvent.getParameter("arguments").invoiceId;
            const oView =  this.getView()
            // oView.setBusy(true);
            oView.bindElement({path: "/Invoices('" +invoiceId + "')"});

        
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

                        const oInvoiceModel = new sap.ui.model.json.JSONModel(oData);
                        oView.setModel(oInvoiceModel, "invoiceModel");

                        const oItemsModel = new sap.ui.model.json.JSONModel(oData.items?.results || []);
                        oView.setModel(oItemsModel, "itemsModel");
                        // oView.setBusy(false);
                    },
                    error: () => {
                        MessageToast.show("Failed to load invoice details");
                        oView.setBusy(false);
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
        },

        onOpenUpdateDialog: function () {
            const oView = this.getView();
            const oData = oView.getModel("invoiceModel").getData();
            
            const oInvoiceModel = new sap.ui.model.json.JSONModel(oData);
            const oItemsModel = new sap.ui.model.json.JSONModel(oData.items.results)

            if (!this.updateDialog) {
                Fragment.load({
                    name: "ns.invoiceui.fragment.UpdateInvoice",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    oDialog.setModel(oInvoiceModel, "invoice");
                    oDialog.setModel(oItemsModel, "itemsModel")

                    const datePicker = sap.ui.getCore().byId("updateDate");
                    datePicker.setMaxDate(new Date());

                    oDialog.open();
                    this.datePickerInputDisable("updateDate");
                    this.updateDialog = oDialog;
                }.bind(this));
            } else {
                this.updateDialog.setModel(oInvoiceModel, "invoice");
                this.updateDialog.setModel(oItemsModel, "itemsModel")
                this.updateDialog.open();
                this.datePickerInputDisable("updateDate");
            }
        },
         onUpdateCancel: function () {
            this.updateDialog.close();
            this.clearErrorValueStates("update")
        },

        onUpdateSubmit: function () {
            const oView = this.getView();
            const oData = oView.getModel("invoiceModel").getData();
            if (!this.validateFields("update")) {
                MessageToast.show("Please fill in all fields")
                return;
            }
            const oDatePicker = sap.ui.getCore().byId("updateDate");
            const selectedDate = oDatePicker.getDateValue();
            // // Validation: check if date is selected
            // if (!selectedDate) {
            //     oDatePicker.setValueState("Error");
            //     oDatePicker.setValueStateText("Please select a valid date.");
            //     MessageToast.show("Please select date from DatePicker");
            //     return;
            // }
            // if (selectedDate > new Date()) {
            //     oDatePicker.setValueState("Error");
            //     oDatePicker.setValueStateText("Future dates are not allowed.");
            //     MessageToast.show("Future dates are not allowed.");
            //     return;
            // }

            //items
            // const itemsData = this.updateDialog.getModel("itemsModel").getData();
            const itemsData = sap.ui.getCore().byId("updateItemsTable").getModel("itemsModel").getData();
            
            const valid = this.validateItems(itemsData)
            if(!valid) return;

            const payload = {
                invoiceNumber: sap.ui.getCore().byId("updateInvoiceNumber").getValue(),
                date: this.formatDateToLocal(selectedDate),
                amount: parseFloat(sap.ui.getCore().byId("updateAmount").getValue()),
                status: sap.ui.getCore().byId("updateStatus").getSelectedKey(),
                items:itemsData
            };
            const oModel = this.getView().getModel();

            oModel.update("/Invoices('" + oData.ID + "')", payload, {
                success: () => {
                    MessageToast.show("Invoice Updated");
                    this.updateDialog.close();

                    oModel.refresh(true);
                    this.getView().getController().onObjectMatched({
                    getParameter: () => ({ invoiceId: oData.ID })
                    });

                    const oEventBus = sap.ui.getCore().getEventBus();
                    oEventBus.publish("Invoices", "Reload")
                },
                error: (oError) => {
                    let message = "Update failed";

                    if (oError && oError.responseText) {
                        try {
                            const errorObj = JSON.parse(oError.responseText);
                            message = errorObj.error.message.value || message;
                        } catch (e) {
                        }
                    }

                    MessageBox.error(message);
                }
            })
        },
        
        onAddItemRow: function (oEvent) {
            const dialogType = oEvent.getSource().data("dialogType")
            const tableId = dialogType === "create" ? "idItemsTable" : "updateItemsTable"

            
            // const oTable = sap.ui.getCore().byId("idItemsTable");
            const oTable = sap.ui.getCore().byId(tableId)
            const oModel = oTable.getModel("itemsModel"); 
            const aItems = oModel.getData();
            aItems.push({ name: "", quantity: null, price: null, total: 0 });
            oModel.setData(aItems);

            this.updateInvoiceAmount(aItems,dialogType)
        },

        onDeleteItemRow: function (oEvent) {
            const dialogType = oEvent.getSource().data("dialogType")
            const tableId = dialogType === "create" ? "idItemsTable" : "updateItemsTable"

            const oTable = sap.ui.getCore().byId(tableId);
            const oModel = oTable.getModel("itemsModel");
            const aItems = oModel.getData();
            const index = oTable.indexOfItem(oEvent.getSource().getParent());
            const that = this
            MessageBox.confirm("Are you sure you want to delete this item?", {
                title: "Confirm Deletion",
                onClose: function (oAction) {
                    if (oAction === "OK") {
                            aItems.splice(index, 1)
                            oModel.setData(aItems);
                            that.updateInvoiceAmount(aItems, dialogType)
                        };
                    }
                });
        },

        updateInvoiceAmount: function(items, dialogType){
            const amountId = dialogType === "create" ? "idAmount" : "updateAmount"
            const sum = items.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0)
            const amountField = sap.ui.getCore().byId(amountId);
            if(amountField){
                amountField.setValue(sum.toFixed(2));
            }
        },

        onItemPriceChange: function (oEvent) {
            const dialogType = oEvent.getSource().data("dialogType")
            const value =oEvent.getSource().getValue();
            const oContext = oEvent.getSource().getBindingContext("itemsModel");
            oContext.setProperty("price", value)
            const data = oContext.getObject();
            this.calculateItemTotal(data);

            const items = oContext.getModel().getData();
            this.updateInvoiceAmount(items, dialogType)
            oContext.getModel().refresh();
        },

        onItemQuantityChange: function (oEvent) {
            const dialogType = oEvent.getSource().data("dialogType")
            const value =oEvent.getSource().getValue();
            const oContext = oEvent.getSource().getBindingContext("itemsModel");
            // oEvent.getSource().getBindingContext("itemsModel").setProperty("quantity", value)
            oContext.setProperty("quantity", value)
            const data = oContext.getObject();
            const price = parseFloat(data.price) || 0;
            data.price = price.toFixed(2);

            this.calculateItemTotal(data);
            const items = oContext.getModel().getData();
            this.updateInvoiceAmount(items, dialogType)
        },

        calculateItemTotal: function(data) {
            const qty = parseFloat(data.quantity) || 0;
            const price = parseFloat(data.price) || 0;
            // data.price = price.toFixed(2)
            data.total = (qty * price).toFixed(2);
        },

         validateFields: function (dialogType) {
            const fieldIds = {
                create: {
                    dialogId: "createDialog",
                    fields: [
                        "idInvoiceNumber",
                        "idDate",
                        "idAmount",
                        "idStatus"
                    ]
                },
                update: {
                    dialogId: "updateDialog",
                    fields: [
                        "updateDate",
                        "updateAmount",
                        "updateStatus"
                    ]
                }
            }
            const { dialog, fields } = fieldIds[dialogType]
            let isValid = true
            fields.forEach((fieldId) => {
                const control = sap.ui.getCore().byId(fieldId)
                const value = control.getValue ? control.getValue() : control.getSelectedKey?.();
                let messa = "This field is required"
                if (!value) {
                    if (fieldId=="idDate"){
                        messa = "Please select date from date picker" 
                    }
                    control.setValueState("Error")
                    control.setValueStateText(messa);
                    isValid = false;
                }
                else {
                    control.setValueState("None");
                }
            })
            return isValid;
        },
         validateItems: function(itemsData) {
            let allItemsValid = true
            if (!itemsData || itemsData.length === 0) {
                allItemsValid = false
                MessageBox.error("Please add atleast one item for this invoice.")
                return allItemsValid
            }
            
            itemsData.forEach((item, index) => {
                if(!item.name || item.name.trim() === "") {
                    allItemsValid=false
                    MessageBox.error(`Item ${index + 1}: Name is required.`)
                    return allItemsValid
                }
                if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
                    allItemsValid = false;
                    MessageBox.error(`Item ${index + 1}: Please enter a valid quantity.`);
                    return allItemsValid
                }
                if (isNaN(item.price) || parseFloat(item.price) <= 0) {
                    allItemsValid = false;
                    MessageBox.error(`Item ${index + 1}: Please enter a valid price.`);
                    return allItemsValid;
                }
            });
            return allItemsValid;
        },

        clearErrorValueStates: function (dialogType) {
            const fieldIds = {
                create: [
                    "idInvoiceNumber",
                    "idDate",
                    "idAmount",
                    "idStatus"
                ],
                update: [
                    "updateDate",
                    "updateDescription",
                    "updateAmount",
                    "updateStatus"
                ]
            };
        
            fieldIds[dialogType].forEach((fieldId) => {
                const control = sap.ui.getCore().byId(fieldId);
                if (control && control.setValueState) {
                    control.setValueState("None");
                }
            });
        },
        
        datePickerInputDisable: function (dateId) {
            const oDatePicker = sap.ui.getCore().byId(dateId);
            if (oDatePicker) {
                const input = oDatePicker.$().find("input");
                input.on("keydown", function (e) {
                    e.preventDefault()
                })
            }
        },

        formatDateToLocal: function (dateObj) {
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
        },
    });
});
