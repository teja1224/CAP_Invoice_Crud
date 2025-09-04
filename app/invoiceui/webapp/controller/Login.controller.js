
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox"
], function (Controller, MessageBox) {
  "use strict";

  return Controller.extend("com.invoiceapp.controller.Login", {

    onLogin: async function () {
      const email = this.byId("emailInput").getValue();
      const password = this.byId("passwordInput").getValue();
      const that = this

      if (!email || !password) {
        MessageBox.error("Please enter email and password");
        return;
      }

      const oModel = this.getOwnerComponent().getModel()
      oModel.callFunction("/login", {
                method: "POST",
                urlParameters: {
                    email: email,
                    password: password
                },
                success: function (sMessage) {
                    var userdata = JSON.parse(sMessage.login);
          
                    if (userdata && userdata.ID) {
                      sap.m.MessageToast.show("Login successful!");
                     const oSession = new sap.ui.model.json.JSONModel({
                        customerId: userdata.ID,
                        customerName: userdata.name,
                        customerEmail: userdata.email
                     })
                     sap.ui.getCore().setModel(oSession, "sessionModel");
                     localStorage.setItem("customerDetails", JSON.stringify(oSession.getData()));
                    
                      // Navigate to invoice list
                    const oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                    oRouter.navTo("RouteView1", {}, true);
                  } 
                },
                error: (oError) => {
                    let message = "Login failed";

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
            })
            this.byId("emailInput").setValue("");
            this.byId("passwordInput").setValue("");
    },

    onOpenRegister: function () {
    if (!this._oRegisterDialog) {
        this._oRegisterDialog = sap.ui.xmlfragment("ns.invoiceui.fragment.Register", this);
        this.getView().addDependent(this._oRegisterDialog);
    }
    this._oRegisterDialog.open();
},

  onCloseRegister: function () {
      if (this._oRegisterDialog) {
          this._oRegisterDialog.close();
      }
  },

  onRegister: function () {
      const oModel = this.getOwnerComponent().getModel();

      const oEntry = {
          name: sap.ui.getCore().byId("regName").getValue(),
          email: sap.ui.getCore().byId("regEmail").getValue(),
          phone: sap.ui.getCore().byId("regPhone").getValue(),
          password: sap.ui.getCore().byId("regPassword").getValue()
      };

      if (!oEntry.name || !oEntry.email || !oEntry.password) {
          sap.m.MessageToast.show("Please fill required fields");
          return;
      }

      oModel.create("/Customers", oEntry, {
          success: () => {
              sap.m.MessageToast.show("Registration successful! Please login.");
              this.onCloseRegister();
          },
          error: () => {
              sap.m.MessageToast.show("Registration failed");
          }
      });
    }
  });
});
