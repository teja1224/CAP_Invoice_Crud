module.exports = srv => {
    const db = cds.entities("invoice");
  
    srv.on("login", async (req) => {
      const { email, password } = req.data;
  
      const customer = await SELECT.one.from(db.Customers)
        .where({ email, password });
  
      if (!customer) {
        return req.error(401, "Invalid email or password");
      }
  
      return customer.ID;
    });
  };
  