namespace invoice;

entity Customers {
  key ID    : UUID;
      name  : String(100);
      email : String;
      phone : String;
      password : String;
}

entity Invoices {
  key ID        : UUID;
      invoiceNumber : String(20) @assert.unique;
      date          : Date;
      amount        : Decimal(10,2);
      customer      : Association to Customers;
}