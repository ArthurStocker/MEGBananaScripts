// @api = 1.0
// @id = ch.meg.apps.example.poc
// @description = PoC for the "Erneuerungsfond" Report after year closing
// @task = app.command
// @doctype = nodocument
// @publisher = Arthur Stocker
// @pubdate = 2019-02-20
// @inputdatasource = none
// @timeout = -1

var texts;
var titleStart = "";

/**
 * Main function executed when starting the app 
 * "Erneuerungsfond" Report for MEG Banana Accounting.
 * @param {*} inData 
 */
function exec(inData, options) {
  if (!Banana.document) {
    return "@Cancel";
  }

  var document = Banana.document;

  var lang = getLang(document);
  if (!lang) {
    lang = "en";
  }
  texts = loadTexts(document, lang);
  var userParam = initUserParam(texts);

  // Retrieve saved param
  var savedParam = document.getScriptSettings();
  if (savedParam && savedParam.length > 0) {
    userParam = JSON.parse(savedParam);
  }

  // If needed show the settings dialog to the user
  if (!options || !options.useLastSettings) {
    userParam = settingsDialog(); // From properties
  }

  if (!userParam) {
    return "@Cancel";
  }

  // Retrieves all the donors to print
  var jsonData = getDataToPrint(document, userParam);

  // Banana.console.log(JSON.stringify(jsonData));

  // Creates the report
  if (jsonData.length > 0) {
    var report = createReport(document, jsonData, userParam);
    var stylesheet = createStyleSheet(null, userParam);
    Banana.Report.preview(report, stylesheet);
  } else {
    return "@Cancel";
  }

  // var report = createReport(document, jsonData, userParam);
  // setInvoiceStyle(repDocObj, stylesheet, userParam);
  // setPvrStyle(repDocObj, stylesheet, userParam);
}


/* */
function getDocumentInfo(document, userParam) {
  var documentInfo = {};

  documentInfo.currency = document.info("AccountingDataBase", "BasicCurrency");
  documentInfo.date = document.info("Base", "DateLastSaved");
  documentInfo.opening_date = document.info("AccountingDataBase", "OpeningDate");
  documentInfo.closure_date = document.info("AccountingDataBase", "ClosureDate");
  documentInfo.customers_group = document.info("AccountingDataBase", "CustomersGroup");
  documentInfo.supliers_group = document.info("AccountingDataBase", "SupliersGroup");
  documentInfo.decimals_amounts = document.info("AccountingDataBase", "DecimalsAmountsCurrency");
  documentInfo.description = document.info("AccountingDataBase", "BasicCurrency");
  documentInfo.doc_type = document.info("AccountingDataBase", "FileTypeGroup");
  documentInfo.locale = document.info("AccountingDataBase", "Language");
  documentInfo.number = document.info("AccountingDataBase", "BasicCurrency");
  documentInfo.origin_row = "-1";
  documentInfo.origin_table = "DocumentInfo";
  documentInfo.printed = "0";
  documentInfo.rounding_total = "0.05";
  documentInfo.type = "closing_statement";



  return documentInfo;
}

/* Address of the sender (Organization) */
function getSupplier(document, userParam) {
  var supplier = {};

  supplier.address1 = document.info("AccountingDataBase", "Address1");
  supplier.address2 = document.info("AccountingDataBase", "Address2");
  supplier.business_name = document.info("AccountingDataBase", "Company");
  supplier.city = document.info("AccountingDataBase", "City");
  supplier.courtesy = document.info("AccountingDataBase", "Courtesy");
  supplier.email = document.info("AccountingDataBase", "Email");
  supplier.fax = document.info("AccountingDataBase", "Fax");
  supplier.first_name = document.info("AccountingDataBase", "Name");
  supplier.fiscal_number = document.info("AccountingDataBase", "FiscalNumber");
  supplier.last_name = document.info("AccountingDataBase", "FamilyName");
  supplier.phone = document.info("AccountingDataBase", "Phone");
  supplier.postal_code = document.info("AccountingDataBase", "Zip");
  supplier.state = document.info("AccountingDataBase", "State");
  supplier.country = document.info("AccountingDataBase", "Country");
  supplier.vat_number = document.info("AccountingDataBase", "VatNumber");
  supplier.web = document.info("AccountingDataBase", "Web");

  return supplier;
}

/* */
function getBalance(document, userParam, divisor, customer, documentInfo) {
  var accounts = [];
  var table = document.table("Accounts");
  var rows = table.findRows(
    function(rowObj, rowNr, table) {
      // Return true if Gr eq. userParam.renewalsfund_costcenters
      return rowObj.value("Gr") === userParam.renewalsfund_costcenters;
    }
  ).concat(
    table.findRows(
      function(rowObj, rowNr, table) {
        // Return true if ....
        return rowObj.value("Group") === userParam.renewalsfund_costcenters;
      }
    )
  );

  for (var i = 0; i < rows.length; i++) {
    var account = {};
    var row = rows[i];

    if (row.value("Group") != "") {
      account.type = "total";
    }
    account.bclass = row.value("BClass");
    //account.opening = toInvoiceAmountFormat(documentInfo, row.value("Balance") / divisor);
    account.balance = toInvoiceAmountFormat(documentInfo, row.value("Balance") / divisor);
    account.description = row.value("BankName") ? row.value("BankName") : row.value("Description");
    account.origin_row = row.rowNr;
    account.origin_table = "Accounts";

    accounts.push(account);

  }

  return accounts;
}


/* */
function getInterests(document, userParam, divisor, customer, documentInfo) {
  var accounts = [];
  var table = document.table("Accounts");
  var rows = table.findRows(
    function(rowObj, rowNr, table) {
      // Return true if ....
      return rowObj.value("Group") === userParam.intrest_balance /*&& rowObj.value("Balance") != 0*/ ;
    }
  ).concat(
    table.findRows(
      function(rowObj, rowNr, table) {
        // Return true if ....
        return rowObj.value("Gr") === userParam.intrest_balance && rowObj.value("BankAccount") != "";
      }
    )
  ).concat(
    table.findRows(
      function(rowObj, rowNr, table) {
        // Return true if ....
        return rowObj.value("Group") === userParam.bank_balance /*&& rowObj.value("Balance") != 0*/ ;
      }
    )
  ).concat(
    table.findRows(
      function(rowObj, rowNr, table) {
        // Return true if ....
        return rowObj.value("Gr") === userParam.bank_balance && rowObj.value("BankAccount") != "";
      }
    )
  );

  for (var i = 0; i < rows.length; i++) {
    var account = {};
    var row = rows[i];

    if (row.value("Group") != "") {
      account.type = "note";
    }
    account.bclass = row.value("BClass");
    //account.opening = toInvoiceAmountFormat(documentInfo, (row.value("Balance") * (row.value("BClass") == '2' ? -1 : 1)) / divisor);
    account.balance = toInvoiceAmountFormat(documentInfo, (row.value("Balance") * (row.value("BClass") == '2' ? -1 : 1)) / divisor);
    account.description = toLocalDateFormat("de-CH", "{$closure_date:date}", row.value("BankName") + " " + row.value("BankAccount"), documentInfo);
    account.origin_row = row.rowNr;
    account.origin_table = "Accounts";

    accounts.push(account);

  }

  return accounts;
}

/* Function that retrieves the customers of the given group */
function getCustomers(document, userParam, documentInfo, supplierInfo, accountNumber) {
  var customers = [];
  var table = document.table("Accounts");
  var rows = table.findRows(
    function(rowObj, rowNr, table) {
      // Return true if Gr eq. documentInfo.customersGroup
      return rowObj.value("Gr") === documentInfo.customers_group;
    }
  );

  for (var i = 0; i < rows.length; i++) {
    var customer = {};
    var row = rows[i];

    if (accountNumber === row.value("Account") || !accountNumber) {
      customer.business_name = row.value("Company");
      customer.first_name = row.value("FirstName");
      customer.last_name = row.value("LastName");
      customer.address1 = row.value("Address1");
      customer.address2 = row.value("Address2");
      customer.address3 = row.value("Address3");
      customer.postal_code = row.value("Zip");
      customer.city = row.value("Town");
      customer.province = row.value("Province");
      customer.country = row.value("Country");
      customer.country_code = row.value("CountryCode");
      customer.lang = row.value("Language");
      customer.code = row.value("Code");
      customer.number = row.value("Account");
      customer.origin_row = row.rowNr;
      customer.origin_table = "Accounts";

      customers.push({ document_info: documentInfo, supplier_info: supplierInfo, customer_info: customer, balance: getBalance(document, userParam, rows.length, customer, documentInfo), interests: getInterests(document, userParam, rows.length, customer, documentInfo) });
    }
  }
  return customers;
}

/* */
function toInvoiceAmountFormat(documentInfo, value) {
  return Banana.Converter.toLocaleNumberFormat(value, documentInfo.decimals_amounts, true);
}

/* */
function toLocalDateFormat(locale, variable, text, value) {
  var format = variable.match(/{\$(.*):(.*)}/);

  Banana.console.log(JSON.stringify(format));

  if (locale == "de-CH") {
    if (format[2] == "date") {
      return text.replace(variable, (function(date) { return date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear(); })(new Date(value[format[1]])));
    }
    if (format[2] == "year") {
      return text.replace(variable, (function(date) { return date.getFullYear(); })(new Date(value[format[1]])));
    }
  }

  return text;
}

/* Function that retrieves the data to print. */
function getDataToPrint(document, userParam) {

  // Get the list of all the customers
  var customers = getCustomers(document, userParam, getDocumentInfo(document, userParam), getSupplier(document, userParam));

  return customers;
}

/* if overwritten .... */
function getHeader(jsonData, userParam, texts) {
  var documentHeader = texts.header;
  if (userParam.header) {
    documentHeader = userParam.header;
  }
  // if (userParam.useHeaderOfAccountgroup) {
  //     documentHeader = jsonData.document_info.description;
  // }
  // if (jsonData.customer_info.business_name) {
  //     documentHeader += " - " + jsonData.customer_info.business_name;
  // } else if (jsonData.customer_info.first_name || jsonData.customer_info.last_name) {
  //     documentHeader += " - ";
  //     if (jsonData.customer_info.first_name) {
  //         documentHeader += " " + jsonData.customer_info.first_name;
  //     }
  //     if (dataObj.customer_info.last_name) {
  //         documentHeader += " " + jsonData.customer_info.last_name;
  //     }
  // }


  if (!userParam.print_close) {
    documentHeader = toLocalDateFormat("de-CH", "{$closure_date:date}", JSON.parse(documentHeader)[0], jsonData.document_info);
  } else {
    documentHeader = toLocalDateFormat("de-CH", "{$closure_date:year}", JSON.parse(documentHeader)[1], jsonData.document_info);
  }

  return documentHeader;
}

/* The report is created using the selected period and the data of the dialog */
function createReport(document, jsonData, userParam) {

  var report = null;

  for (var k = 0; k < jsonData.length; k++) {
    report = printReport(jsonData[k], userParam, report);
  }

  return report;
}

function printReport(jsonData, userParam, report) {

  //Banana.console.log(JSON.stringify(jsonData));

  var header = getHeader(jsonData, userParam, texts);

  // Report document
  if (!report) {
    report = Banana.Report.newReport(header);
  } else {
    report.setTitle(header);
  }
  var pageBreak = report.addPageBreak();
  pageBreak.addClass("pageReset");


  //====================================================================//
  // 1. HEADER
  //====================================================================//
  if (userParam.print_header) {
    var table = report.addTable("header_table");
    var headerCol1 = table.addColumn("headerCol1");

    var row = table.addRow();
    var cell = row.addCell("", "", 1);
    var business_name = '';
    if (jsonData.supplier_info.business_name) {
      business_name = jsonData.supplier_info.business_name;
    }
    if (business_name.length <= 0) {
      if (jsonData.supplier_info.first_name) {
        business_name = jsonData.supplier_info.first_name + " ";
      }
      if (jsonData.supplier_info.last_name) {
        business_name += jsonData.supplier_info.last_name;
      }
    }
    cell.addParagraph(business_name.toUpperCase(), "logo left bold");

    var row = table.addRow();
    var supplierLines = getFormatedSupplier(jsonData.supplier_info).split('\n');
    var cell = row.addCell("", "", 1);
    for (var i = 0; i < supplierLines.length; i++) {
      cell.addParagraph(supplierLines[i], "headerAddress");
    }
  }


  //====================================================================//
  // 2. ADDRESSES
  //====================================================================//
  var addressTable = report.addTable("address_table");
  var addressCol1 = addressTable.addColumn("addressCol1");
  var addressCol2 = addressTable.addColumn("addressCol2");
  var addressCol3 = addressTable.addColumn("addressCol3");

  var row = addressTable.addRow();

  var cell = row.addCell("", "", 1);
  cell.addParagraph(texts.date + ": " + Banana.Converter.toLocaleDateFormat(jsonData.document_info.date));
  cell.addParagraph(texts.customer + ": " + jsonData.customer_info.number);

  //Payment Terms
  // if (jsonData.billing_info.payment_term) {
  //     cell.addParagraph(texts.payment_terms_label + ": " + jsonData.billing_info.payment_term);
  // } else if (jsonData.payment_info.due_date) {
  //     var payment_terms_label = texts.payment_due_date_label;
  //     payment_terms = Banana.Converter.toLocaleDateFormat(jsonData.payment_info.due_date);
  //     cell.addParagraph(payment_terms_label + ": " + payment_terms);
  // }
  //cell.addParagraph(texts.page + ": ", "").addFieldPageNr();

  var cell = row.addCell("", "", 1);

  var cell = row.addCell("", "", 1);
  var addressLines = getFormatedCustomer(jsonData.customer_info).split('\n');
  for (var i = 0; i < addressLines.length; i++) {
    cell.addParagraph(addressLines[i], "");
  }


  //====================================================================//
  // 3 TITLE
  //====================================================================//
  /*
  var titleTable = report.addTable("title_table");
  var row = titleTable.addRow();
  row.addCell(getHeader(jsonData, userParam, texts) + " " + jsonData.document_info.number, "bold title");
  */
  // beginn text
  if (userParam.print_body) {
    titleStart = 115;
    var text = userParam.body.split('\n');
    var body = report.addParagraph("", "body");
    for (var i = 0; i < text.length; i++) {
      body.addText(text[i]);
      body.addLineBreak();
    }
  } else {
    titleStart = 90;
  }


  //====================================================================//
  // 4. TABLE ITEMS/DOCUMENT
  //====================================================================//
  if (!userParam.print_body) {
    if (!userParam.print_close) {
      /* */
      var docTable = report.addTable("doc_table");
      var docTableCol1 = docTable.addColumn("docTableCol1");
      var docTableCol2 = docTable.addColumn("docTableCol2");

      var row = docTable.getHeader().addRow();
      var cell = row.addCell(toLocalDateFormat("de-CH", "{$closure_date:date}", JSON.parse(texts.header)[0], jsonData.document_info), "padding-right docTableHeader", 1);
      var cell = row.addCell("", "padding-left docTableHeaderamount", 1);

      var row = docTable.addRow();
      row.addCell("Konto", classNameEvenRow + " padding-right border-bottom noteDescription", 1);
      row.addCell(jsonData.document_info.currency, classNameEvenRow + " padding-left padding-right border-bottom amount note", 1);

      // BALANCE
      for (var i = 0; i < jsonData.balance.length; i++) {
        var item = jsonData.balance[i];

        var className = "item";
        if (item.type && item.type.indexOf("note") === 0) {
          className = "note";
        }
        if (item.type && item.type.indexOf("total") === 0) {
          className = "total";
        }

        var classNameEvenRow = "";
        if (i % 2 == 0 && item.item_type && !item.type.indexOf("text") === 0) {
          classNameEvenRow = "evenRowsBackgroundColor";
        }

        var row = docTable.addRow();
        if (className == "total") {
          row.addCell(item.description, classNameEvenRow + " padding-right border-top " + className + "Description", 1);
          row.addCell(item.balance, classNameEvenRow + " padding-left padding-right border-top amount " + className + "Description", 1);
        } else {
          var descriptionCell = row.addCell(item.description, classNameEvenRow + " padding-right " + className, 1);
          descriptionCell.addParagraph(item.longdescription);
          descriptionCell.addParagraph(item.descriptiontext);
          row.addCell(item.balance, classNameEvenRow + " padding-left amount " + className, 1);
        }
      }
    } else {
      /* */
      var docTable = report.addTable("doc_table");
      var docTableCol1 = docTable.addColumn("docTableCol1");
      var docTableCol2 = docTable.addColumn("docTableCol2");

      var row = docTable.getHeader().addRow();
      var cell = row.addCell(toLocalDateFormat("de-CH", "{$closure_date:year}", JSON.parse(texts.header)[1], jsonData.document_info), "padding-right docTableHeader", 1);
      var cell = row.addCell("", "padding-left docTableHeader amount", 1);

      // INTRESTS
      for (var i = 0; i < jsonData.interests.length; i++) {
        var item = jsonData.interests[i];

        var className = "item";
        if (item.type && item.type.indexOf("note") === 0) {
          className = "note";
        }
        if (item.type && item.type.indexOf("total") === 0) {
          className = "total";
        }

        var classNameEvenRow = "";
        if (i % 2 == 0 && item.item_type && !item.type.indexOf("text") === 0) {
          classNameEvenRow = "evenRowsBackgroundColor";
        }

        var row = docTable.addRow();
        if (className == "note") {
          row.addCell(item.description, classNameEvenRow + " padding-right border-bottom " + className + "Description", 1);
          row.addCell(jsonData.document_info.currency, classNameEvenRow + " padding-left padding-right border-bottom amount " + className, 1);
        } else {
          var descriptionCell = row.addCell(item.description, classNameEvenRow + " padding-right " + className, 1);
          descriptionCell.addParagraph(item.longdescription);
          descriptionCell.addParagraph(item.descriptiontext);
          row.addCell(item.balance, classNameEvenRow + " padding-left amount " + className, 1);
        }
      }
    }
  }

  return report;

}

/* Formated Supplier */
function getFormatedCustomer(customer) {

  var address = "";

  if (customer.courtesy) {
    address = customer.courtesy + "\n";
  }

  if (customer.first_name || customer.last_name) {
    if (customer.first_name) {
      address = address + customer.first_name + " ";
    }
    if (customer.last_name) {
      address = address + customer.last_name;
    }
    address = address + "\n";
  }

  if (customer.business_name) {
    address = address + customer.business_name + "\n";
  }

  if (customer.address1) {
    address = address + customer.address1 + "\n";
  }

  if (customer.address2) {
    address = address + customer.address2 + "\n";
  }

  if (customer.address3) {
    address = address + customer.address3 + "\n";
  }

  if (customer.postal_code) {
    address = address + customer.postal_code + " ";
  }

  if (customer.city) {
    address = address + customer.city + "\n";
  }

  if (customer.country) {
    address = address + customer.country;
  }

  return address;
}

/* Formated Supplier */
function getFormatedSupplier(supplier) {

  var supplierAddressRow1 = "";
  var supplierAddressRow2 = "";
  var supplierAddressRow3 = "";
  var supplierAddress = "";

  //Row 1
  if (supplier.first_name) {
    supplierAddressRow1 = supplierAddressRow1 + supplier.first_name + " ";
  }

  if (supplier.last_name) {
    supplierAddressRow1 = supplierAddressRow1 + supplier.last_name + ", ";
  }

  if (supplierAddressRow1.length <= 0) {
    if (supplier.business_name) {
      supplierAddressRow1 = supplierAddressRow1 + supplier.business_name + ", ";
    }
  }

  if (supplier.address1) {
    supplierAddressRow1 = supplierAddressRow1 + supplier.address1 + ", ";
  }

  if (supplier.address2) {
    supplierAddressRow1 = supplierAddressRow1 + supplier.address2 + ", ";
  }

  if (supplier.postal_code) {
    supplierAddressRow1 = supplierAddressRow1 + supplier.postal_code + " ";
  }

  if (supplier.city) {
    supplierAddressRow1 = supplierAddressRow1 + supplier.city + ", ";
  }

  if (supplier.country) {
    supplierAddressRow1 = supplierAddressRow1 + supplier.country;
  }

  //Remove last character if it is a ","
  var str = supplierAddressRow1.trim();
  var lastChar = str[str.length - 1];
  if (lastChar === ",") {
    supplierAddressRow1 = str.slice(0, -1);
  }

  //Row 2
  if (supplier.phone) {
    supplierAddressRow2 = supplierAddressRow2 + "Tel: " + supplier.phone + ", ";
  }

  if (supplier.fax) {
    supplierAddressRow2 = supplierAddressRow2 + "Fax: " + supplier.fax + ", ";
  }

  if (supplier.email) {
    supplierAddressRow2 = supplierAddressRow2 + supplier.email + ", ";
  }

  if (supplier.web) {
    supplierAddressRow2 = supplierAddressRow2 + supplier.web;
  }

  //Remove last character if it is a ","
  var str = supplierAddressRow2.trim();
  var lastChar = str[str.length - 1];
  if (lastChar === ",") {
    supplierAddressRow2 = str.slice(0, -1);
  }

  // //Row 3
  // if (supplier.fiscal_number) {
  //    supplierAddressRow3 = supplierAddressRow3 + supplier.fiscal_number + ", ";
  // }

  // if (supplier.vat_number) {
  //    supplierAddressRow3 = supplierAddressRow3 + supplier.vat_number;
  // }

  //Final address (row1 + row2 + row3)
  supplierAddress = supplierAddress + supplierAddressRow1 + "\n" + supplierAddressRow2; // + "\n" + supplierAddressRow3;
  return supplierAddress;
}






/* Function that converts parameters of the dialog */
function convertParam(userParam) {
  var document = Banana.document;

  var lang = getLang(document);
  if (!lang) {
    lang = "en";
  }
  var texts = loadTexts(document, lang);

  var convertedParam = {};
  convertedParam.version = '1.0';
  /*array dei parametri dello script*/
  convertedParam.data = [];

  var currentParam = {};

  currentParam.name = 'print_landscape';
  currentParam.title = texts.param_print_landscape;
  currentParam.type = 'bool';
  currentParam.value = userParam.print_landscape ? true : false;
  currentParam.readValue = function() {
    userParam.print_landscape = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'print_header';
  currentParam.title = texts.param_print_header;
  currentParam.type = 'bool';
  currentParam.value = userParam.print_header ? true : false;
  currentParam.readValue = function() {
    userParam.print_header = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'print_close';
  currentParam.title = texts.param_print_close;
  currentParam.type = 'bool';
  currentParam.value = userParam.print_close ? true : false;
  currentParam.readValue = function() {
    userParam.print_close = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'print_body';
  currentParam.title = texts.param_print_body;
  currentParam.type = 'bool';
  currentParam.value = userParam.print_body ? true : false;
  currentParam.readValue = function() {
    userParam.print_body = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'body';
  currentParam.title = texts.body;
  currentParam.type = 'string';
  currentParam.value = userParam.body ? userParam.body : '';
  currentParam.readValue = function() {
    userParam.body = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'bank_balance';
  currentParam.title = texts.param_bank_balance;
  currentParam.type = 'string';
  currentParam.value = userParam.bank_balance ? userParam.bank_balance : '';
  currentParam.readValue = function() {
    userParam.bank_balance = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'intrest_balance';
  currentParam.title = texts.param_intrest_balance;
  currentParam.type = 'string';
  currentParam.value = userParam.intrest_balance ? userParam.intrest_balance : '';
  currentParam.readValue = function() {
    userParam.intrest_balance = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'renewalsfund_balance';
  currentParam.title = texts.param_renewalsfund_balance;
  currentParam.type = 'string';
  currentParam.value = userParam.renewalsfund_balance ? userParam.renewalsfund_balance : '';
  currentParam.readValue = function() {
    userParam.renewalsfund_balance = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'renewalsfund_costcenters';
  currentParam.title = texts.param_renewalsfund_costcenters;
  currentParam.type = 'string';
  currentParam.value = userParam.renewalsfund_costcenters ? userParam.renewalsfund_costcenters : '';
  currentParam.readValue = function() {
    userParam.renewalsfund_costcenters = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'font_family';
  currentParam.title = texts.param_font_family;
  currentParam.type = 'string';
  currentParam.value = userParam.font_family ? userParam.font_family : 'Calibri';
  currentParam.readValue = function() {
    userParam.font_family = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'color_1';
  currentParam.title = texts.param_color_1;
  currentParam.type = 'string';
  currentParam.value = userParam.color_1 ? userParam.color_1 : '#000000';
  currentParam.readValue = function() {
    userParam.color_1 = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'color_2';
  currentParam.title = texts.param_color_2;
  currentParam.type = 'string';
  currentParam.value = userParam.color_2 ? userParam.color_2 : '';
  currentParam.readValue = function() {
    userParam.color_2 = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'color_3';
  currentParam.title = texts.param_color_3;
  currentParam.type = 'string';
  currentParam.value = userParam.color_3 ? userParam.color_3 : '#ffffff';
  currentParam.readValue = function() {
    userParam.color_3 = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'color_4';
  currentParam.title = texts.param_color_4;
  currentParam.type = 'string';
  currentParam.value = userParam.color_4 ? userParam.color_4 : '#f2f2f2';
  currentParam.readValue = function() {
    userParam.color_4 = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'color_5';
  currentParam.title = texts.param_color_5;
  currentParam.type = 'string';
  currentParam.value = userParam.color_5 ? userParam.color_5 : '';
  currentParam.readValue = function() {
    userParam.color_5 = this.value;
  }
  convertedParam.data.push(currentParam);

  currentParam = {};
  currentParam.name = 'color_6';
  currentParam.title = texts.param_color_6;
  currentParam.type = 'string';
  currentParam.value = userParam.color_6 ? userParam.color_6 : '#005392';
  currentParam.readValue = function() {
    userParam.color_6 = this.value;
  }
  convertedParam.data.push(currentParam);

  return convertedParam;
}

/* Function that initializes the user parameters */
function initUserParam(texts) {
  var userParam = {};
  userParam.print_landscape = false;
  userParam.print_header = true;
  userParam.print_close = false;
  userParam.print_body = false;
  userParam.body = 'Als Vorbereitung auf die Miteigentümer-Versammlung im März überreiche ich Euch die Variante des Budgets.\nAuf Wunsch und nach Terminabsprache könnt Ihr bei uns Einsicht in die Details der Abschlussrechnung des Vorjahres nehmen.';
  userParam.bank_balance = '1-1';
  userParam.intrest_balance = '4-8';
  userParam.renewalsfund_balance = '2-4';
  userParam.renewalsfund_costcenters = 'EBJ';
  userParam.font_family = 'Calibri';
  userParam.color_1 = '#000000';
  userParam.color_2 = '';
  userParam.color_3 = '#ffffff';
  userParam.color_4 = '#f2f2f2';
  userParam.color_5 = '';
  userParam.color_6 = '#005392';
  return userParam;
}

/* Function that shows the dialog window and let user to modify the parameters */
function parametersDialog(userParam) {

  if (typeof(Banana.Ui.openPropertyEditor) !== 'undefined') {
    var dialogTitle = texts.dialogTitle;
    var convertedParam = convertParam(userParam);
    var pageAnchor = 'dlgSettings';
    if (!Banana.Ui.openPropertyEditor(dialogTitle, convertedParam, pageAnchor)) {
      return null;
    }

    for (var i = 0; i < convertedParam.data.length; i++) {
      // Read values to userParam (through the readValue function)
      convertedParam.data[i].readValue();
    }

    // Reset default values
    userParam.useDefaultTexts = false;
  }

  return userParam;

}

/* Function that shows a dialog window for the period and let user to modify the parameters */
function settingsDialog() {

  var document = Banana.document;

  var lang = getLang(document);
  if (!lang) {
    lang = "en";
  }
  texts = loadTexts(document, lang);
  var scriptform = initUserParam(texts);

  // Retrieve saved param
  var savedParam = document.getScriptSettings();
  if (savedParam && savedParam.length > 0) {
    //scriptform = JSON.parse(savedParam);
  }

  scriptform = parametersDialog(scriptform); // From properties
  if (scriptform) {
    var paramToString = JSON.stringify(scriptform);
    Banana.document.setScriptSettings(paramToString);
  }

  return scriptform;

}

/* Function that takes the locale language of Banana */
function getLang(document) {
  var lang = document.locale;
  if (lang && lang.length > 2)
    lang = lang.substr(0, 2);
  return lang;
}

/* Function that creates styles */
function createStyleSheet(stylesheet, userParam) {

  if (!stylesheet) {
    stylesheet = Banana.Report.newStyleSheet();
  }

  //Overwrite default page margin of 20mm
  var style = stylesheet.addStyle("@page");
  if (userParam.landscape) {
    style.setAttribute("size", "landscape");
  }
  style.setAttribute("margin", "0mm");

  //====================================================================//
  // GENERAL
  //====================================================================//
  stylesheet.addStyle(".pageReset", "counter-reset:page");

  stylesheet.addStyle("body", "font-size:12pt; font-family:" + userParam.font_family);

  stylesheet.addStyle(".bold", "font-weight:bold");

  stylesheet.addStyle(".left", "text-align:left");
  stylesheet.addStyle(".right", "text-align:right");
  stylesheet.addStyle(".center", "text-align:center");

  stylesheet.addStyle(".padding-left", "padding-left:2mm");
  stylesheet.addStyle(".padding-right", "padding-right:2mm");


  stylesheet.addStyle(".title", "font-size:18pt; color:" + userParam.color_1);

  stylesheet.addStyle(".docTableHeader", "font-size:16pt; font-weight:bold; color:" + userParam.color_1 + "; background-color:" + userParam.color_2);
  stylesheet.addStyle(".docTableHeader td", "padding-top:2mm; padding-bottom:2mm");

  if (!userParam.param_print_header) {
    stylesheet.addStyle(".docTableHeaderHidden", "font-size:16pt; font-weight:bold; color:" + userParam.color_1 + "; background-color:" + userParam.color_2);
    stylesheet.addStyle(".docTableHeaderHidden td", "padding-top:2mm; padding-bottom:2mm");
  }

  //stylesheet.addStyle(".item", "font-size:12pt");
  stylesheet.addStyle(".noteDescription", "font-size:16pt; padding-top:7mm");
  stylesheet.addStyle(".totalDescription", "font-weight:bold; font-size:12pt; padding-top:2mm");
  stylesheet.addStyle(".amount", "text-align:right");
  //stylesheet.addStyle(".vatInfo", "font-size:14pt; vertical-align:top;");
  //stylesheet.addStyle(".totalInfo", "font-size:16pt; color:" + userParam.color_1);
  stylesheet.addStyle(".evenRowsBackgroundColor", "background-color:" + userParam.color_4);

  stylesheet.addStyle(".border-top", "border-top:thin solid " + userParam.color_1);
  stylesheet.addStyle(".border-bottom", "border-bottom:thin solid " + userParam.color_1);

  stylesheet.addStyle(".logo", "padding-left:-1px; font-size:24pt; color:" + userParam.color_6);
  stylesheet.addStyle(".headerCol1", "width:173mm");
  stylesheet.addStyle(".headerAddress", "font-size:9pt");

  stylesheet.addStyle(".addressCol1", "width:88mm");
  stylesheet.addStyle(".addressCol2", "width:20mm");
  stylesheet.addStyle(".addressCol3", "width:65mm");
  //stylesheet.addStyle(".addressCol1R0", "width:100%");

  stylesheet.addStyle(".docTableCol1", "width:143mm");
  stylesheet.addStyle(".docTableCol2", "width:30mm");

  //====================================================================//
  // Text begin
  //====================================================================//
  var beginStyle = stylesheet.addStyle(".body");
  beginStyle.setAttribute("position", "absolute");
  beginStyle.setAttribute("top", "130mm");
  beginStyle.setAttribute("left", "20mm");
  beginStyle.setAttribute("right", "17mm");

  //====================================================================//
  // TABLES
  //====================================================================//
  var headerStyle = stylesheet.addStyle(".header_table");
  headerStyle.setAttribute("position", "absolute");
  headerStyle.setAttribute("margin-top", "10mm");
  headerStyle.setAttribute("margin-left", "20mm");
  headerStyle.setAttribute("margin-right", "17mm");
  //headerStyle.setAttribute("border", "thin solid " + userParam.color_1);
  //headerStyle.setAttribute("width", "100%");
  //stylesheet.addStyle("table.header_table td", "border: thin solid black");

  var addressStyle = stylesheet.addStyle(".address_table");
  addressStyle.setAttribute("position", "absolute");
  addressStyle.setAttribute("margin-top", "55mm");
  addressStyle.setAttribute("margin-left", "20mm");
  addressStyle.setAttribute("margin-right", "17mm");
  //addressStyle.setAttribute("border", "thin solid " + userParam.color_1);
  //stylesheet.addStyle("table.address_table td", "border: thin solid #6959CD");
  //addressStyle.setAttribute("width", "100%");

  var infoStyle = stylesheet.addStyle(".title_table");
  infoStyle.setAttribute("position", "absolute");
  infoStyle.setAttribute("margin-top", titleStart + "mm");
  infoStyle.setAttribute("margin-left", "20mm");
  infoStyle.setAttribute("margin-right", "17mm");
  //infoStyle.setAttribute("border", "thin solid " + userParam.color_1);
  //stylesheet.addStyle("table.info_table td", "border: thin solid black");
  //infoStyle.setAttribute("width", "100%");

  var itemsStyle = stylesheet.addStyle(".doc_table:first-view");
  itemsStyle.setAttribute("position", "absolute");
  itemsStyle.setAttribute("margin-top", (titleStart + 15) + "mm");
  itemsStyle.setAttribute("margin-left", "20mm");
  itemsStyle.setAttribute("margin-right", "17mm");
  //itemsStyle.setAttribute("border", "thin solid " + userParam.color_1);
  //stylesheet.addStyle("table.doc_table td", "border: thin solid #6959CD;");
  //itemsStyle.setAttribute("width", "100%");

  var itemsStyleFollowing = stylesheet.addStyle(".doc_table");
  itemsStyleFollowing.setAttribute("position", "absolute");
  itemsStyleFollowing.setAttribute("margin-top", titleStart + "mm");
  itemsStyleFollowing.setAttribute("margin-left", "20mm");
  //itemsStyleFollowing.setAttribute("margin-right", "17mm");
  //stylesheet.addStyle("table.doc_table td", "border: thin solid #6959CD;");
  //itemsStyleFollowing.setAttribute("width", "100%");

  return stylesheet;
}

/* Function that loads all the default texts used for the dialog and the report  */
function loadTexts(document, language) {
  var texts = {};
  if (language == 'de') {
    texts.customer = 'Kunden-Nr';
    texts.date = 'Datum';
    texts.header = '["Kontostand per {$closure_date:date}", "Zins- und Kapitalausweis {$closure_date:year}"]';
    texts.description = 'Beschreibung';
    texts.body = '';
    texts.page = 'Seite';
    texts.rounding = 'Rundung';
    texts.total = 'Total';
    texts.totalnet = 'Netto-Betrag';
    texts.vat = 'MwSt.';
    texts.qty = 'Menge';
    texts.unit_ref = 'Einheit';
    texts.unit_price = 'Preiseinheit';
    texts.vat_number = 'Mehrwertsteuernummer: ';
    texts.bill_to = 'Rechnungsadresse';
    texts.shipping_to = 'Lieferadresse';
    texts.from = 'VON';
    texts.to = 'ZU';
    texts.param_color_1 = 'Textfarbe';
    texts.param_color_2 = 'Hintergrundfarbe';
    texts.param_font_family = 'Typ Schriftzeichen';
    texts.param_print_landscape = 'Vertikaler Ausdruck (1=ja, 0=nein)';
    texts.param_print_header = 'Seitenüberschrift einschliessen (1=ja, 0=nein)';
    texts.param_print_close = 'Zins- und Kapitalausweis drucken (1=ja, 0=nein)';
    texts.param_print_body = 'Text ausdrucken (1=ja, 0=nein)';
    texts.param_bank_balance = 'Summe Kasse und Bankkonten (Spalte Gr)';
    texts.param_intrest_balance = 'Summe Zinsertrag (Spalte Gr)';
    texts.param_renewalsfund_balance = 'Summe Erneuerungsfonds (Spalte Gr)';
    texts.param_renewalsfund_costcenters = 'Erneuerungsfonds nach Jahren (Spalte Gr)';
    texts.payment_due_date_label = 'Fälligkeitsdatum';
    texts.payment_terms_label = 'Zahlungsbedingungen';
    //texts.param_max_items_per_page = 'Anzahl der Zeilen auf jeder Rechnung';
  } else if (language == 'fr') {
    texts.customer = 'No Client';
    texts.date = 'Date';
    texts.header = '["Certificat ....", "...."]';
    texts.description = 'Description';
    texts.body = '';
    texts.page = 'Page';
    texts.rounding = 'Arrondi';
    texts.total = 'Total';
    texts.totalnet = 'Total net';
    texts.vat = 'TVA';
    texts.qty = 'Quantité';
    texts.unit_ref = 'Unité';
    texts.unit_price = 'Prix unité';
    texts.vat_number = 'Numéro de TVA: ';
    texts.bill_to = 'Adresse de facturation';
    texts.shipping_to = 'Adresse de livraison';
    texts.from = 'DE';
    texts.to = 'À';
    texts.param_color_1 = 'Couleur de fond';
    texts.param_color_2 = 'Couleur du texte';
    texts.param_font_family = 'Police de caractère';
    texts.param_print_landscape = '... (1=oui, 0=non)';
    texts.param_print_header = 'Inclure en-tête de page (1=oui, 0=non)';
    texts.param_print_close = ' .... ';
    texts.param_print_body = 'Imprimer ... (1=oui, 0=non)';
    texts.param_bank_balance = '1-1';
    texts.param_intrest_balance = '4-8';
    texts.param_renewalsfund_balance = 'ERF';
    texts.param_renewalsfund_costcenters = 'Adresse de la banque (seulement avec compte bancaire, avec compte postal laisser vide)';
    texts.payment_due_date_label = 'Echéance';
    texts.payment_terms_label = 'Paiement';
    //texts.param_max_items_per_page = 'Nombre d’éléments sur chaque facture';
  } else if (language == 'it') {
    texts.customer = 'No Cliente';
    texts.date = 'Data';
    texts.header = '["Attestato ....", "...."]';
    texts.description = 'Descrizione';
    texts.body = '';
    texts.page = 'Pagina';
    texts.rounding = 'Arrotondamento';
    texts.total = 'Totale';
    texts.totalnet = 'Totale netto';
    texts.vat = 'IVA';
    texts.qty = 'Quantità';
    texts.unit_ref = 'Unità';
    texts.unit_price = 'Prezzo unità';
    texts.vat_number = 'Partita IVA: ';
    texts.bill_to = 'Indirizzo fatturazione';
    texts.shipping_to = 'Indirizzo spedizione';
    texts.from = 'DA';
    texts.to = 'A';
    texts.param_color_1 = 'Colore testo';
    texts.param_color_2 = 'Colore sfondo';
    texts.param_font_family = 'Tipo carattere';
    texts.param_print_landscape = '... (1=si, 0=no)';
    texts.param_print_header = 'Includi intestazione pagina (1=si, 0=no)';
    texts.param_print_close = ' .... ';
    texts.param_print_body = 'Stampa ... (1=si, 0=no)';
    texts.param_bank_balance = '1-1';
    texts.param_intrest_balance = '4-8';
    texts.param_renewalsfund_balance = 'ERF';
    texts.param_renewalsfund_costcenters = 'Indirizzo banca (solo con conto bancario, con conto postale lasciare vuoto)';
    texts.payment_due_date_label = 'Scadenza';
    texts.payment_terms_label = 'Pagamento';
    //texts.param_max_items_per_page = 'Numero di linee su ogni fattura';
  } else if (language == 'nl') {
    texts.customer = 'Klantennummer';
    texts.date = 'Datum';
    texts.header = '["Kwitantie ....", "...."]';
    texts.description = 'Beschrijving';
    texts.body = '';
    texts.page = 'Pagina';
    texts.rounding = 'Afronding';
    texts.total = 'Totaal';
    texts.totalnet = 'Totaal netto';
    texts.vat = 'BTW';
    texts.qty = 'Hoeveelheid';
    texts.unit_ref = 'Eenheid';
    texts.unit_price = 'Eenheidsprijs';
    texts.vat_number = 'BTW-nummer: ';
    texts.bill_to = 'Factuuradres';
    texts.shipping_to = 'Leveringsadres';
    texts.from = 'VAN';
    texts.to = 'TOT';
    texts.param_color_1 = 'Tekstkleur';
    texts.param_color_2 = 'Achtergrond kleur';
    texts.param_font_family = 'Lettertype';
    texts.param_print_landscape = '... (1=ja, 0=nee)';
    texts.param_print_header = 'Pagina-koptekst opnemen (1=ja, 0=nee)';
    texts.param_print_close = ' .... ';
    texts.param_print_body = 'Print ... (1=yes, 0=no)';
    texts.param_bank_balance = '1-1';
    texts.param_intrest_balance = '4-8';
    texts.param_renewalsfund_balance = 'ERF';
    texts.param_renewalsfund_costcenters = 'Bank address (only with bank account, with postal account leave blank)';
    texts.payment_due_date_label = 'Vervaldatum';
    texts.payment_terms_label = 'Betaling';
    //texts.param_max_items_per_page = 'Aantal artikelen op iedere pagina';
  } else {
    texts.customer = 'Customer No';
    texts.date = 'Date';
    texts.header = '["Closing Statement", "...."]'; // used
    texts.description = 'Description';
    texts.body = '';
    texts.page = 'Page';
    texts.rounding = 'Rounding';
    texts.total = 'Total';
    texts.totalnet = 'Total net';
    texts.vat = 'VAT';
    texts.qty = 'Quantity';
    texts.unit_ref = 'Unit';
    texts.unit_price = 'Unit price';
    texts.vat_number = 'VAT Number: ';
    texts.bill_to = 'Billing address';
    texts.shipping_to = 'Shipping address';
    texts.from = 'FROM';
    texts.to = 'TO';
    texts.param_color_1 = 'Text Color';
    texts.param_color_2 = 'Background Color';
    texts.param_font_family = 'Font type';
    texts.param_print_landscape = '... (1=yes, 0=no)';
    texts.param_print_header = 'Include page header (1=yes, 0=no)';
    texts.param_print_close = ' .... ';
    texts.param_print_body = 'Print body (1=yes, 0=no)';
    texts.param_bank_balance = '1-1';
    texts.param_intrest_balance = '4-8';
    texts.param_renewalsfund_balance = 'ERF';
    texts.param_renewalsfund_costcenters = 'Bank address (only with bank account, with postal account leave blank)';
    texts.payment_due_date_label = 'Due date';
    texts.payment_terms_label = 'Payment';
    //texts.param_max_items_per_page = 'Number of items on each page';
  }
  return texts;
}
