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
var docStart = "";

/**
 * Main function that is executed when starting the app 
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
function getCalculation(document, userParam, divisor, documentInfo) {
    var calculations = [];
    var table = document.table("Accounts");
    var rows = table.findRows(
        function(rowObj, rowNr, table) {
            // Return true if ....
            return (rowObj.value("Gr") === userParam.bank_balance || rowObj.value("Gr") === userParam.customer_balance || rowObj.value("Gr") === userParam.renewalsfund_costcenters || rowObj.value("Account") === userParam.accruals_balance) && rowObj.value("Balance") != 0;
        }
    );

    for (var i = 0; i < rows.length; i++) {
        var calculation = {};
        var row = rows[i];

        //calculation.opening = toInvoiceAmountFormat(documentInfo, row.value("Balance"));
        calculation.balance = toInvoiceAmountFormat(documentInfo, row.value("Balance") * (row.value("BClass") != '' && row.value("BClass") % 2 == 0 ? -1 : 1));
        calculation.description = row.value("Description");
        calculation.origin_row = row.rowNr;
        calculation.origin_table = "Accounts";

        calculations.push(calculation);

    }

    Banana.console.log(JSON.stringify(calculations));

    return calculations;
}

/* */
function getAccounts(document, userParam, divisor, documentInfo) {
    var accounts = [];
    var table = document.table("Accounts");
    var rows = table.findRows(
        function(rowObj, rowNr, table) {
            // Return true if Gr eq. userParam.renewalsfund_costcenters
            return rowObj.value("Gr") === userParam.renewalsfund_costcenters;
        }
    );

    for (var i = 0; i < rows.length; i++) {
        var account = {};
        var row = rows[i];

        //account.opening = toInvoiceAmountFormat(documentInfo, row.value("Balance") / divisor);
        account.balance = toInvoiceAmountFormat(documentInfo, row.value("Balance") / divisor);
        account.description = row.value("Description");
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
            // Return true if Gr eq. userParam.customer_accounts
            return rowObj.value("Gr") === userParam.customer_accounts;
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

            customers.push({ document_info: documentInfo, customer_info: customer, supplier_info: supplierInfo, items: getCalculation(document, userParam, rows.length, documentInfo), transactions: getAccounts(document, userParam, rows.length, documentInfo) });
        }
    }
    return customers;
}

/* */
function toInvoiceAmountFormat(documentInfo, value) {

    return Banana.Converter.toLocaleNumberFormat(value, documentInfo.decimals_amounts, true);
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
        var col = table.addColumn("col1");

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
    var addressCol2 = addressTable.addColumn("addressCol2")

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
    var addressLines = getFormatedCustomer(jsonData.customer_info).split('\n');
    for (var i = 0; i < addressLines.length; i++) {
        cell.addParagraph(addressLines[i], "");
    }


    //Text begin
    if (userParam.print_body) {
        titleStart = "115mm";
        docStart = "130mm";
        var text = userParam.body.split('\n');
        var body = report.addParagraph("", "body");
        for (var i = 0; i < text.length; i++) {
            body.addText(text[i]);
            body.addLineBreak();
        }
    } else {
        titleStart = "90mm";
        docStart = "105mm";
    }

    /*
    //====================================================================//
    // 3 TITLE
    //====================================================================//
    var titleTable = report.addTable("title_table");
    var row = titleTable.addRow();
    row.addCell(getHeader(jsonData, userParam, texts) + " " + jsonData.document_info.number, "bold title");
    */


    //====================================================================//
    // 4. TABLE ITEMS/DOCUMENT
    //====================================================================//
    if (!userParam.print_body) {
        if (userParam.print_close) {
        var docTable = report.addTable("doc_table");
        var docTableCol1 = report.addColumn("docTableCol1");
        var docTableCol2 = report.addColumn("docTableCol2");
        var docTableCol3 = report.addColumn("docTableCol3");
        //var docTableCol4 = report.addColumn("docTableCol4");

        var row = docTable.getHeader().addRow();
        row.addCell(texts.heading, "padding-left doc_table_header", 1);
        ////row.addCell(texts.qty, "padding-right doc_table_header amount", 1);
        ////row.addCell(texts.unit_price, "padding-right doc_table_header amount", 1);
        row.addCell("", "doc_table_header", 1)
        row.addCell(texts.total + " " + jsonData.document_info.currency, "padding-right doc_table_header amount", 1);
        // row.addCell("", "doc_table_header_hidden", 1)

        //ITEMS
        for (var i = 0; i < jsonData.items.length; i++) {
            var item = jsonData.items[i];

            var className = "item_cell";
            if (item.item_type && item.item_type.indexOf("total") === 0) {
                className = "subtotal_cell";
            }
            if (item.item_type && item.item_type.indexOf("note") === 0) {
                className = "note_cell";
            }

            var classNameEvenRow = "";
            if (i % 2 == 0 && item.item_type && !item.item_type.indexOf("text") === 0) {
                classNameEvenRow = "evenRowsBackgroundColor";
            }

            var row = docTable.addRow();
            var descriptionCell = row.addCell("", classNameEvenRow + " padding-left " + className, 2);
            descriptionCell.addParagraph(item.description);
            descriptionCell.addParagraph(item.description2);

            if (className == "note_cell") {
                row.addCell("", classNameEvenRow + " padding-left padding-right thin-border-top " + className, 1);
            } else {
                row.addCell(item.balance, classNameEvenRow + " padding-right amount " + className, 1);
                //toInvoiceAmountFormat(jsonData, item.total_amount_vat_inclusive)
            }
        }
        } else {
        /* */
        var docTable = report.addTable("doc_table");
        var docTableCol1 = report.addColumn("docTableCol1");
        var docTableCol2 = report.addColumn("docTableCol2");
        var docTableCol3 = report.addColumn("docTableCol3");
        //var docTableCol4 = report.addColumn("docTableCol4");

        var row = docTable.getHeader().addRow();
        row.addCell(texts.header, "padding-left doc_table_header", 1);
        ////row.addCell(texts.qty, "padding-right doc_table_header amount", 1);
        ////row.addCell(texts.unit_price, "padding-right doc_table_header amount", 1);
        row.addCell("", "doc_table_header", 1)
        row.addCell(texts.total + " " + jsonData.document_info.currency, "padding-right doc_table_header amount", 1);
        // row.addCell("", "doc_table_header_hidden", 1)

        //TRANSACTIONS
        for (var i = 0; i < jsonData.transactions.length; i++) {
            var item = jsonData.transactions[i];

            var className = "item_cell";
            if (item.item_type && item.item_type.indexOf("total") === 0) {
                className = "subtotal_cell";
            }
            if (item.item_type && item.item_type.indexOf("note") === 0) {
                className = "note_cell";
            }

            var classNameEvenRow = "";
            if (i % 2 == 0 && item.item_type && !item.item_type.indexOf("text") === 0) {
                classNameEvenRow = "evenRowsBackgroundColor";
            }

            var row = docTable.addRow();
            var descriptionCell = row.addCell("", classNameEvenRow + " padding-left " + className, 2);
            descriptionCell.addParagraph(item.description);
            descriptionCell.addParagraph(item.description2);

            if (className == "note_cell") {
                row.addCell("", classNameEvenRow + " padding-left padding-right thin-border-top " + className, 1);
            } else {
                row.addCell(item.balance, classNameEvenRow + " padding-right amount " + className, 1);
                //toInvoiceAmountFormat(jsonData, item.total_amount_vat_inclusive)
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
    currentParam.name = 'header';
    currentParam.title = texts.heading + texts.header;
    currentParam.type = 'string';
    currentParam.value = userParam.header ? userParam.header : texts.header;
    currentParam.readValue = function() {
        userParam.header = this.value;
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
    currentParam.name = 'customer_balance';
    currentParam.title = texts.param_customer_balance;
    currentParam.type = 'string';
    currentParam.value = userParam.customer_balance ? userParam.customer_balance : '';
    currentParam.readValue = function() {
        userParam.customer_balance = this.value;
    }
    convertedParam.data.push(currentParam);

    currentParam = {};
    currentParam.name = 'accruals_balance';
    currentParam.title = texts.param_accruals_balance;
    currentParam.type = 'string';
    currentParam.value = userParam.accruals_balance ? userParam.accruals_balance : '';
    currentParam.readValue = function() {
        userParam.accruals_balance = this.value;
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
    currentParam.name = 'customer_accounts';
    currentParam.title = texts.param_customer_accounts;
    currentParam.type = 'string';
    currentParam.value = userParam.customer_accounts ? userParam.customer_accounts : '';
    currentParam.readValue = function() {
        userParam.customer_accounts = this.value;
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
    currentParam.value = userParam.color_1 ? userParam.color_1 : '#005392';
    currentParam.readValue = function() {
        userParam.color_1 = this.value;
    }
    convertedParam.data.push(currentParam);

    currentParam = {};
    currentParam.name = 'color_2';
    currentParam.title = texts.param_color_2;
    currentParam.type = 'string';
    currentParam.value = userParam.color_2 ? userParam.color_2 : '#ffffff';
    currentParam.readValue = function() {
        userParam.color_2 = this.value;
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
    userParam.header = texts.header;
    userParam.body = 'Als Vorbereitung auf die Miteigentümer-Versammlung im März überreiche ich Euch die Variante des Budgets.\nAuf Wunsch und nach Terminabsprache könnt Ihr bei uns Einsicht in die Details der Abschlussrechnung des Vorjahres nehmen.';
    userParam.bank_balance = '1-1';
    userParam.customer_balance = '1100';
    userParam.accruals_balance = '2330';
    userParam.renewalsfund_balance = '2480';
    userParam.customer_accounts = '990100';
    userParam.renewalsfund_costcenters = 'EBJ';
    userParam.font_family = 'Calibri';
    userParam.color_1 = '#005392';
    userParam.color_2 = '#ffffff';
    userParam.color_3 = '';
    userParam.color_4 = '';
    userParam.color_5 = '';
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

        //  Reset reset default values
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

    scriptform = parametersDialog(scriptform); // From propertiess
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
    stylesheet.addStyle(".pageReset", "counter-reset: page");
    stylesheet.addStyle("body", "font-size: 12pt; font-family:" + userParam.font_family);
    stylesheet.addStyle(".logo", "font-size: 24pt; color:" + userParam.color_1);
    stylesheet.addStyle(".headerAddress", "font-size:9pt");
    stylesheet.addStyle(".amount", "text-align:right");
    stylesheet.addStyle(".subtotal_cell", "font-weight:bold;");
    stylesheet.addStyle(".center", "text-align:center");
    stylesheet.addStyle(".left", "text-align:left");
    stylesheet.addStyle(".bold", "font-weight: bold");
    stylesheet.addStyle(".title", "font-size:18pt; color:" + userParam.color_1);
    stylesheet.addStyle(".doc_table_header", "font-weight:bold; background-color:" + userParam.color_1 + "; color:" + userParam.color_2);
    stylesheet.addStyle(".doc_table_header td", "padding-top:5px; padding-bottom:5px");

    if (!userParam.param_print_header) {
        stylesheet.addStyle(".doc_table_header_hidden", "font-weight:bold");
        stylesheet.addStyle(".doc_table_header_hidden td", "padding-top:5px; padding-bottom:5px");
    }

    stylesheet.addStyle(".total", "font-size:16pt; color: " + userParam.color_1);
    stylesheet.addStyle(".evenRowsBackgroundColor", "background-color:#f2f2f2");
    stylesheet.addStyle(".border-bottom", "border-bottom:2px solid " + userParam.color_1);
    stylesheet.addStyle(".border-top", "border-top:2px solid " + userParam.color_1);
    stylesheet.addStyle(".padding-right", "padding-right:5px");
    stylesheet.addStyle(".padding-left", "padding-left:5px");
    stylesheet.addStyle(".vatInfo", "font-size: 12pt;vertical-align:top;");
    stylesheet.addStyle(".col1", "width:100%");
    stylesheet.addStyle(".addressCol1", "width:53%");
    stylesheet.addStyle(".addressCol2", "width:43%");
    //stylesheet.addStyle(".addressCol1R0", "width:100%");

    stylesheet.addStyle(".docTableCol1", "width:80%");
    stylesheet.addStyle(".docTableCol2", "width:0%");
    stylesheet.addStyle(".docTableCol3", "width:20%");
    stylesheet.addStyle(".docTableCol4", "width:100%");

    var rectangleStyle = stylesheet.addStyle(".rectangle");
    rectangleStyle.setAttribute("width", "50px");
    rectangleStyle.setAttribute("height", "100mm");
    rectangleStyle.setAttribute("background-color", "white");

    //====================================================================//
    // Text begin
    //====================================================================//
    var beginStyle = stylesheet.addStyle(".body");
    beginStyle.setAttribute("position", "absolute");
    beginStyle.setAttribute("top", "130mm");
    beginStyle.setAttribute("left", "20mm");
    beginStyle.setAttribute("right", "10mm");
    beginStyle.setAttribute("font-size", "10px");

    //====================================================================//
    // TABLES
    //====================================================================//
    var headerStyle = stylesheet.addStyle(".header_table");
    headerStyle.setAttribute("position", "absolute");
    headerStyle.setAttribute("margin-top", "10mm"); //106
    headerStyle.setAttribute("margin-left", "20mm"); //20
    headerStyle.setAttribute("margin-right", "4mm");
    //headerStyle.setAttribute("width", "100%");
    //stylesheet.addStyle("table.header_table td", "border: thin solid black");

    var infoStyle = stylesheet.addStyle(".title_table");
    infoStyle.setAttribute("position", "absolute");
    infoStyle.setAttribute("margin-top", titleStart);
    infoStyle.setAttribute("margin-left", "22mm");
    infoStyle.setAttribute("margin-right", "10mm");
    //stylesheet.addStyle("table.info_table td", "border: thin solid black");
    infoStyle.setAttribute("width", "100%");

    var addressStyle = stylesheet.addStyle(".address_table");
    addressStyle.setAttribute("position", "absolute");
    addressStyle.setAttribute("margin-top", "50mm");
    addressStyle.setAttribute("margin-left", "20mm");
    addressStyle.setAttribute("margin-right", "10mm");
    //stylesheet.addStyle("table.address_table td", "border: thin solid #6959CD");
    //addressStyle.setAttribute("width", "100%");

    var itemsStyle = stylesheet.addStyle(".doc_table:first-view");
    itemsStyle.setAttribute("margin-top", docStart);

    var itemsStyle = stylesheet.addStyle(".doc_table");
    itemsStyle.setAttribute("margin-top", "45mm"); //106
    itemsStyle.setAttribute("margin-left", "23mm"); //20
    itemsStyle.setAttribute("margin-right", "10mm");
    //stylesheet.addStyle("table.doc_table td", "border: thin solid #6959CD;");
    itemsStyle.setAttribute("width", "100%");

    return stylesheet;
}

/* Function that loads all the default texts used for the dialog and the report  */
function loadTexts(document, language) {
    var texts = {};
    if (language == 'de') {
        texts.customer = 'Kunden-Nr';
        texts.date = 'Datum';
        texts.description = 'Beschreibung';
        texts.heading = 'Abschlussrechnung';
        texts.header = 'Kontostand';
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
        texts.param_color_1 = 'Hintergrundfarbe';
        texts.param_color_2 = 'Textfarbe';
        texts.param_font_family = 'Typ Schriftzeichen';
        texts.param_print_landscape = ' .... ';
        texts.param_print_header = 'Seitenüberschrift einschliessen (1=ja, 0=nein)';
        texts.param_print_close = ' .... P1 ';
        texts.param_print_body = 'Text ausdrucken (1=ja, 0=nein)';
        texts.param_bank_balance = '1-1';
        texts.param_customer_balance = '990100';
        texts.param_accruals_balance = '2330';
        texts.param_renewalsfund_balance = '2480';
        texts.param_customer_accounts = 'Name der Bank (nur Bankkonto, mit Postkonto leer lassen)';
        texts.param_renewalsfund_costcenters = 'Bankadresse (nur Bankkonto, mit Postkonto leer lassen)';
        texts.payment_due_date_label = 'Fälligkeitsdatum';
        texts.payment_terms_label = 'Zahlungsbedingungen';
        //texts.param_max_items_per_page = 'Anzahl der Zeilen auf jeder Rechnung';
    } else if (language == 'fr') {
        texts.customer = 'No Client';
        texts.date = 'Date';
        texts.description = 'Description';
        texts.heading = '.... ';
        texts.header = 'Certificat ....';
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
        texts.param_print_landscape = ' .... ';
        texts.param_print_header = 'Inclure en-tête de page (1=oui, 0=non)';
        texts.param_print_close = ' .... ';
        texts.param_print_body = 'Imprimer ... (1=oui, 0=non)';
        texts.param_bank_balance = '1-1';
        texts.param_customer_balance = 'DEB';
        texts.param_accruals_balance = '290';
        texts.param_renewalsfund_balance = 'ERF';
        texts.param_customer_accounts = 'Compte bancaire (seulement avec compte bancaire, avec compte postal laisser vide)';
        texts.param_renewalsfund_costcenters = 'Adresse de la banque (seulement avec compte bancaire, avec compte postal laisser vide)';
        texts.payment_due_date_label = 'Echéance';
        texts.payment_terms_label = 'Paiement';
        //texts.param_max_items_per_page = 'Nombre d’éléments sur chaque facture';
    } else if (language == 'it') {
        texts.customer = 'No Cliente';
        texts.date = 'Data';
        texts.description = 'Descrizione';
        texts.header = 'Attestato ....';
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
        texts.param_color_1 = 'Colore sfondo';
        texts.param_color_2 = 'Colore testo';
        texts.param_font_family = 'Tipo carattere';
        texts.param_print_landscape = ' .... ';
        texts.param_print_header = 'Includi intestazione pagina (1=si, 0=no)';
        texts.param_print_close = ' .... ';
        texts.param_print_body = 'Stampa ... (1=si, 0=no)';
        texts.param_bank_balance = '1-1';
        texts.param_customer_balance = 'DEB';
        texts.param_accruals_balance = '290';
        texts.param_renewalsfund_balance = 'ERF';
        texts.param_customer_accounts = 'Nome banca (solo con conto bancario, con conto postale lasciare vuoto)';
        texts.param_renewalsfund_costcenters = 'Indirizzo banca (solo con conto bancario, con conto postale lasciare vuoto)';
        texts.payment_due_date_label = 'Scadenza';
        texts.payment_terms_label = 'Pagamento';
        //texts.param_max_items_per_page = 'Numero di linee su ogni fattura';
    } else if (language == 'nl') {
        texts.customer = 'Klantennummer';
        texts.date = 'Datum';
        texts.description = 'Beschrijving';
        texts.heading = '.... ';
        texts.header = 'Kwitantie ....';
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
        texts.param_color_1 = 'Achtergrond kleur';
        texts.param_color_2 = 'Tekstkleur';
        texts.param_font_family = 'Lettertype';
        texts.param_print_landscape = ' .... ';
        texts.param_print_header = 'Pagina-koptekst opnemen (1=ja, 0=nee)';
        texts.param_print_close = ' .... ';
        texts.param_print_body = 'Print ... (1=yes, 0=no)';
        texts.param_bank_balance = '1-1';
        texts.param_customer_balance = 'DEB';
        texts.param_accruals_balance = '290';
        texts.param_renewalsfund_balance = 'ERF';
        texts.param_customer_accounts = 'Bank name (only with bank account, with postal account leave blank)';
        texts.param_renewalsfund_costcenters = 'Bank address (only with bank account, with postal account leave blank)';
        texts.payment_due_date_label = 'Vervaldatum';
        texts.payment_terms_label = 'Betaling';
        //texts.param_max_items_per_page = 'Aantal artikelen op iedere pagina';
    } else {
        texts.customer = 'Customer No';
        texts.date = 'Date';
        texts.description = 'Description';
        texts.heading = 'Heading for the '; // used
        texts.header = 'Closing Statement'; // used
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
        texts.param_color_1 = 'Background Color';
        texts.param_color_2 = 'Text Color';
        texts.param_font_family = 'Font type';
        texts.param_print_landscape = ' .... ';
        texts.param_print_header = 'Include page header (1=yes, 0=no)';
        texts.param_print_close = ' .... ';
        texts.param_print_body = 'Print body (1=yes, 0=no)';
        texts.param_bank_balance = '1-1';
        texts.param_customer_balance = 'DEB';
        texts.param_accruals_balance = '290';
        texts.param_renewalsfund_balance = 'ERF';
        texts.param_customer_accounts = 'Bank name (only with bank account, with postal account leave blank)';
        texts.param_renewalsfund_costcenters = 'Bank address (only with bank account, with postal account leave blank)';
        texts.payment_due_date_label = 'Due date';
        texts.payment_terms_label = 'Payment';
        //texts.param_max_items_per_page = 'Number of items on each page';
    }
    return texts;
}
