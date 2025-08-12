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
            oView.setBusy(true);

            setTimeout(() => {
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
                        oView.setBusy(false)
                    },
                    error: function (oError) {
                        MessageToast.show("Failed to load invoices");
                        console.error(oError);
                        oView.setBusy(false)
                    }
                };
                oModel.read("/Invoices", mParameters);
            }, 1200)


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


        },

        clientfilter: function (selectedStatus, searchValue) {
            const oView = this.getView();
            oView.setBusy(true)

            setTimeout(() => {
                const allInvoices = oView.getModel("AllInvoices").getData()
                let filteredInc = allInvoices;

                if (selectedStatus) {
                    filteredInc = filteredInc.filter(item => item.status === selectedStatus);
                }
                if (searchValue) {
                    const query = searchValue.toLowerCase()
                    filteredInc = filteredInc.filter(item => item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(query))
                }

                // filteredInc.sort((a, b) => new Date(b.date) - new Date(a.date));
                const filteredModel = new sap.ui.model.json.JSONModel(filteredInc)
                oView.setBusy(false)
                oView.setModel(filteredModel, "Invoices")
            }, 1200)

        },

        //object items page for an invoice
        onInvoicePress: function (oEvent) {
            const oContext = oEvent.getParameter("listItem").getBindingContext("Invoices");
            const invoiceData = oContext.getObject();

            // console.log("Invoice clicked:", invoiceData);
        
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("invoiceDetails", {
                invoiceId: invoiceData.ID
            });
        },

        //Items work

        onAddItemRow: function (oEvent) {
            const dialogType = oEvent.getSource().data("dialogType")
            const tableId = dialogType === "create" ? "idItemsTable" : "updateItemsTable"

            
            // const oTable = sap.ui.getCore().byId("idItemsTable");
            const oTable = sap.ui.getCore().byId(tableId)
            const oModel = oTable.getModel("itemsModel"); 
            const aItems = oModel.getData();
            aItems.push({ name: "", quantity: 0, price: 0, total: 0 });
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

        //filtering & searching

        onStatusFilter: function (oEvent) {
            const selectedStatus = oEvent.getSource().getSelectedKey();
            const searchValue = this.byId("invoiceSearch").getValue();
            this.clientfilter(selectedStatus, searchValue);
        },

        onInvoiceSearch: function (oEvent) {
            const searchValue = oEvent.getSource().getValue();
            const statusValue = this.byId("statusFilter").getSelectedKey();
            this.clientfilter(statusValue, searchValue)
        },

        onClearFilters: function () {
            this.byId("invoiceSearch").setValue("");
            this.byId("statusFilter").setSelectedKey("");
            this.clientfilter()
        },

        formatDateToLocal: function (dateObj) {
            const year = dateObj.getFullYear();
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const day = dateObj.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        //Mandatory fields
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

        // onAmountLiveChange: function (oEvent) {
        //     const oInput = oEvent.getSource();
        //     const value = oInput.getValue();
        
        //     // Strict: only numbers and optional decimal, no + or -
        //     const numberPattern = /^\d*\.?\d*$/;
        
        //     if (!numberPattern.test(value) || value.trim() === "") {
        //         oInput.setValueState("Error");
        //         oInput.setValueStateText("Only numeric values are allowed");
        //     } else {
        //         oInput.setValueState("None");
        //     }
        // },

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
        onOpenCreateDialog: function () {

            const view = this.getView();

            if (!this.createDialog) {
                Fragment.load({
                    name: "ns.invoiceui.fragment.CreateInvoice",
                    controller: this
                }).then(function (oDialog) {
                    view.addDependent(oDialog);
                    this.clearDialogInput();
                    // this.createDialog.getModel("itemModel").setData([])
                    //initialize items
                    const itemsModel = new sap.ui.model.json.JSONModel([]);
                    oDialog.setModel(itemsModel, "itemsModel");

                    const datePicker = sap.ui.getCore().byId("idDate");
                    datePicker.setMaxDate(new Date());

                    const amount = sap.ui.getCore().byId("idAmount")
                    amount.setValue(0.00)

                    oDialog.open();
                    this.datePickerInputDisable("idDate");
                    this.createDialog = oDialog;
                }.bind(this));
            } else {
                // this.createDialog.getModel("itemModel").setData([]);
                this.createDialog.open();
                this.datePickerInputDisable("idDate");
            }
        },

        clearDialogInput: function () {
            sap.ui.getCore().byId("idInvoiceNumber").setValue("")
            sap.ui.getCore().byId("idDate").setValue("")
            sap.ui.getCore().byId("idAmount").setValue("")
            sap.ui.getCore().byId("idStatus").setSelectedKey("Pending");
        },

        //validate items table
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

        onCreateSubmit: function () {
            if (!this.validateFields("create")) {
                MessageToast.show("Please fill in all fields.")
                return;
            }
            const oDialog = this.createDialog;

            const oDatePicker = sap.ui.getCore().byId("idDate");
            const selectedDate = oDatePicker.getDateValue();
            // check if date is selected
            if (!selectedDate) {
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Please select date from DatePicker");
                return;
            }

            const itemsData = oDialog.getModel("itemsModel").getData();
            const valid = this.validateItems(itemsData)
            if (!valid) return;

            const payload = {
                invoiceNumber: sap.ui.getCore().byId("idInvoiceNumber").getValue(),
                date: oDatePicker.getValue(),
                amount: parseFloat(sap.ui.getCore().byId("idAmount").getValue()),
                status: sap.ui.getCore().byId("idStatus").getSelectedKey(),
                items: itemsData
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
                    // this.clearDialogInput()
                }
            });
        },

        onCreateCancel: function () {
            this.createDialog.close();
            this.clearErrorValueStates("create")
        },

        //Work on Update Invoice

        onOpenUpdateDialog: function(oEvent) {
            const oContext = oEvent.getSource().getParent().getBindingContext("Invoices");
            const data = oContext.getObject();
            this.editPath = data.editPath;

            const view = this.getView();
            const model = view.getModel();
            model.read(`/Invoices(${data.ID})`, {
                urlParameters: { "$expand":"items" },
                success: (oData) => {
                    if (!this.updateDialog) {
                        Fragment.load({
                            name: "ns.invoiceui.fragment.UpdateInvoice",
                            controller: this
                        }).then(function (oDialog) {
                            view.addDependent(oDialog);
                            this.bindUpdateFields(oData);
        
                            const datePicker = sap.ui.getCore().byId("updateDate");
                            datePicker.setMaxDate(new Date());
                            
                            oDialog.open();
                            this.datePickerInputDisable("updateDate");
                            this.updateDialog = oDialog;
                        }.bind(this));
                    } else {
                        
                        this.bindUpdateFields(oData);
                        this.updateDialog.open();
                        this.datePickerInputDisable("updateDate");
                       
                    }
                }
            })
        },

        bindUpdateFields: function (data) {
            sap.ui.getCore().byId("updateInvoiceNumber").setValue(data.invoiceNumber || "");
            if (data.date) {
                sap.ui.getCore().byId("updateDate").setDateValue(new Date(data.date));
            } else {
                sap.ui.getCore().byId("updateDate").setValue("");
            }
            sap.ui.getCore().byId("updateAmount").setValue(data.amount || "");
            sap.ui.getCore().byId("updateStatus").setSelectedKey(data.status || "Pending");

            //items
            const itemModel = new sap.ui.model.json.JSONModel(data.items.results || []);
            sap.ui.getCore().byId("updateItemsTable").setModel(itemModel, "itemsModel");

            // this.updateDialog.setModel(itemModel, "itemsModel");
        },

        onUpdateSubmit: function () {
            if (!this.validateFields("update")) {
                MessageToast.show("Please fill in all fields")
                return;
            }
            const oDatePicker = sap.ui.getCore().byId("updateDate");
            const selectedDate = oDatePicker.getDateValue();
            // Validation: check if date is selected
            if (!selectedDate) {
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Please select a valid date.");
                MessageToast.show("Please select date from DatePicker");
                return;
            }
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

            oModel.update(this.editPath, payload, {
                success: () => {
                    MessageToast.show("Invoice Updated");
                    // oModel.refresh();
                    this.onRead();
                    this.updateDialog.close();
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

        onUpdateCancel: function () {
            this.updateDialog.close();
            this.clearErrorValueStates("update")
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