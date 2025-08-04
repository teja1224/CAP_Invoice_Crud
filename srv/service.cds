using {invoice as inc} from '../db/schema' ;

service InvoiceService {

  entity Customers as projection on inc.Customers;
  entity Invoices  as projection on inc.Invoices;
  entity Items as projection on inc.Items;

  action login(email: String, password: String) returns Customers;
  
}
