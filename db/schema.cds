namespace invoice;

entity Customers {
  key ID    : UUID;
      name  : String(100);
      email : String @assert.unique;
      phone : String;
      password : String;
}

entity Invoices {
  key ID            : UUID;
      invoiceNumber : String(20) @assert.unique;
      date          : Date;
      amount        : Decimal(10,2);
      status        : String(15);
      createdAt     : Timestamp;
      updatedAt     : Timestamp;
      customer      : Association to Customers;
      items         : Composition of many Items on items.invoice = $self;
}

entity Items {
  key Id  : UUID;
      name: String(100);
      quantity : Integer;
      price : Decimal(10,2);
      total: Decimal(10,2);
      invoice: Association to Invoices;
}