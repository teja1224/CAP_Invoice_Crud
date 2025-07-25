const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const {Customers, Invoices} = this.entities;

  this.on("login", async (req) => {
    const {email, password} = req.data;
    const customer = await SELECT.one.from(Customers).where({email, password});

    if (!customer) {
      return req.error(401, "Invalid email or password");
    }

    return {
      ID: customer.ID,
      name:customer.name,
      email:customer.email
    };
  });

//   this.before("READ", Invoices, async(req) => {
//     if (!req.user || !req.user.email) return;
//     const customer = await SELECT.one.from(Customers).where({ email: req.user.email });
//     if (customer) req.query.where("customer_ID =", customer.ID);
//   });


  this.before("CREATE", Invoices, async (req) => {
    const exists = await SELECT.one.from(Invoices).where({ invoiceNumber: req.data.invoiceNumber });
    if (exists) {
      req.reject(400, `Invoice number '${req.data.invoiceNumber}' already exists.`);
    }
    req.data.createdAt = new Date();
  });

  this.before("UPDATE", Invoices, async (req) => {
    req.data.updatedAt = new Date();
  });
});
