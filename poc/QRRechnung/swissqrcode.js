// Copyright [2020] [Banana.ch SA - Lugano Switzerland]
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/* Script update: 2020-05-22 */



/*
	Summary
	=======

	Extension that prints the Swiss QR-bill following technical implementation on https://www.paymentstandards.ch/dam/downloads/ig-qr-bill-en.pdf

	There are 3 types of QR-bill:
		1. QR-bill with QR-IBAN and QR Reference (QRR) => replace the orange ISR/ISR bank (es. "21 00000 00003 13947 14300 09017")
		2. QR-bill with IBAN and Creditor Reference (SCOR) => new reference number (es. "RF18 5390 0754 7034")
		3. QR-bill with IBAN without reference => replace the red IS

	Other:
		a) With (any amount and 0.00) or without amount (e.g for donation)
		b) With or without debtor
		c) With or without additional information (unstructured message)
		d) With or without billing information (structured message)
*/



function QRBill(banDoc, userParam)
{
	this.banDoc = banDoc;
	this.userParam = userParam;

	//flags to determine the type of qr-bill
	this.ID_QRBILL_WITH_QRIBAN_AND_QRR = false;
	this.ID_QRBILL_WITH_IBAN_AND_SCOR = false;
	this.ID_QRBILL_WITH_IBAN_WITHOUT_REFERENCE = false;
	this.ID_QRBILL_WITHOUT_AMOUNT = false;
	this.ID_QRBILL_WITHOUT_DEBTOR = false;

	//errors
	this.ID_ERR_CURRENCY = "ID_ERR_CURRENCY";
	this.ID_ERR_QRCODE = "ID_ERR_QRCODE";
	this.ID_ERR_QRIBAN = "ID_ERR_QRIBAN";
	this.ID_ERR_QRIBAN_WRONG = "ID_ERR_QRIBAN_WRONG";
	//this.ID_ERR_QRREFERENCE = "ID_ERR_QRREFERENCE";
	this.ID_ERR_IBAN = "ID_ERR_IBAN";
	this.ID_ERR_IBAN_WRONG = "ID_ERR_IBAN_WRONG";
	this.ID_ERR_CREDITORREFERENCE = "ID_ERR_CREDITORREFERENCE";
	this.ID_ERR_DEBTOR_NAME = "ID_ERR_DEBTOR_NAME";
	//this.ID_ERR_DEBTOR_ADDRESS1 = "ID_ERR_DEBTOR_ADDRESS1";
	this.ID_ERR_DEBTOR_POSTALCODE = "ID_ERR_DEBTOR_POSTALCODE";
	this.ID_ERR_DEBTOR_CITY = "ID_ERR_DEBTOR_CITY";
	this.ID_ERR_DEBTOR_COUNTRY = "ID_ERR_DEBTOR_COUNTRY";
	this.ID_ERR_DEBTOR_COUNTRY_WRONG = "ID_ERR_DEBTOR_COUNTRY_WRONG";
	this.ID_ERR_CREDITOR_NAME = "ID_ERR_CREDITOR_NAME";
	//this.ID_ERR_CREDITOR_ADDRESS1 = "ID_ERR_CREDITOR_ADDRESS1";
	this.ID_ERR_CREDITOR_POSTALCODE = "ID_ERR_CREDITOR_POSTALCODE";
	this.ID_ERR_CREDITORR_CITY = "ID_ERR_CREDITORR_CITY";
	this.ID_ERR_CREDITOR_COUNTRY = "ID_ERR_CREDITOR_COUNTRY";
	this.ID_ERR_CREDITOR_COUNTRY_WRONG = "ID_ERR_CREDITOR_COUNTRY_WRONG";
	this.ID_ERR_CUSTOMER_NUMBER = "ID_ERR_CUSTOMER_NUMBER";
	this.ID_ERR_INVOICE_NUMBER = "ID_ERR_INVOICE_NUMBER";

	//swiss cross image
	this.swiss_cross = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIwLjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkViZW5lXzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxOS44IDE5LjgiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDE5LjggMTkuODsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiNGRkZGRkY7fQoJLnN0MXtmaWxsOm5vbmU7c3Ryb2tlOiNGRkZGRkY7c3Ryb2tlLXdpZHRoOjEuNDM1NztzdHJva2UtbWl0ZXJsaW1pdDoxMDt9Cjwvc3R5bGU+Cjxwb2x5Z29uIHBvaW50cz0iMTguMywwLjcgMS42LDAuNyAwLjcsMC43IDAuNywxLjYgMC43LDE4LjMgMC43LDE5LjEgMS42LDE5LjEgMTguMywxOS4xIDE5LjEsMTkuMSAxOS4xLDE4LjMgMTkuMSwxLjYgMTkuMSwwLjcgIi8+CjxyZWN0IHg9IjguMyIgeT0iNCIgY2xhc3M9InN0MCIgd2lkdGg9IjMuMyIgaGVpZ2h0PSIxMSIvPgo8cmVjdCB4PSI0LjQiIHk9IjcuOSIgY2xhc3M9InN0MCIgd2lkdGg9IjExIiBoZWlnaHQ9IjMuMyIvPgo8cG9seWdvbiBjbGFzcz0ic3QxIiBwb2ludHM9IjAuNywxLjYgMC43LDE4LjMgMC43LDE5LjEgMS42LDE5LjEgMTguMywxOS4xIDE5LjEsMTkuMSAxOS4xLDE4LjMgMTkuMSwxLjYgMTkuMSwwLjcgMTguMywwLjcgCgkxLjYsMC43IDAuNywwLjcgIi8+Cjwvc3ZnPgo=";

	//corner marks images
	this.corner_marks_receipt_payable_by_svg = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIyLjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkViZW5lXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNDguMiA1Ny41IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAxNDguMiA1Ny41OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxtZXRhZGF0YT48P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/Pgo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MyA3OS4xNjEzNTYsIDIwMTcvMDkvMDctMDE6MTE6MjIgICAgICAgICI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiLz4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSJ3Ij8+PC9tZXRhZGF0YT4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO3N0cm9rZTojMDAwMDAwO3N0cm9rZS13aWR0aDowLjc1O3N0cm9rZS1taXRlcmxpbWl0OjEwO30KPC9zdHlsZT4KPHBvbHlsaW5lIGNsYXNzPSJzdDAiIHBvaW50cz0iOC41LDU3LjEgOC4zLDU3LjEgMC40LDU3LjEgMC40LDQ3LjggIi8+Cjxwb2x5bGluZSBjbGFzcz0ic3QwIiBwb2ludHM9IjE0Ny44LDQ3LjggMTQ3LjgsNTcuMSAxMzguOSw1Ny4xICIvPgo8cG9seWxpbmUgY2xhc3M9InN0MCIgcG9pbnRzPSIxMzguOSwwLjQgMTQ3LjgsMC40IDE0Ny44LDggMTQ3LjgsOC4xICIvPgo8cG9seWxpbmUgY2xhc3M9InN0MCIgcG9pbnRzPSIwLjQsOC4xIDAuNCw3LjkgMC40LDAuNCA4LjQsMC40IDguNSwwLjQgIi8+Cjwvc3ZnPgo=";
	this.corner_marks_receipt_amount_svg = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIyLjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkViZW5lXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA4NS44IDI5IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA4NS44IDI5OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxtZXRhZGF0YT48P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/Pgo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MyA3OS4xNjEzNTYsIDIwMTcvMDkvMDctMDE6MTE6MjIgICAgICAgICI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiLz4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSJ3Ij8+PC9tZXRhZGF0YT4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO3N0cm9rZTojMDAwMDAwO3N0cm9rZS13aWR0aDowLjc1O3N0cm9rZS1taXRlcmxpbWl0OjEwO30KPC9zdHlsZT4KPHBvbHlsaW5lIGNsYXNzPSJzdDAiIHBvaW50cz0iOC45LDI4LjcgOC43LDI4LjcgMC40LDI4LjcgMC40LDIwLjIgIi8+Cjxwb2x5bGluZSBjbGFzcz0ic3QwIiBwb2ludHM9Ijg1LjQsMjAuMiA4NS40LDI4LjcgNzYuOSwyOC43ICIvPgo8cG9seWxpbmUgY2xhc3M9InN0MCIgcG9pbnRzPSI3Ni45LDAuNCA4NS40LDAuNCA4NS40LDguNSA4NS40LDguOSAiLz4KPHBvbHlsaW5lIGNsYXNzPSJzdDAiIHBvaW50cz0iMC40LDguOSAwLjQsOC43IDAuNCwwLjQgOC43LDAuNCA4LjksMC40ICIvPgo8L3N2Zz4K";
	this.corner_marks_payment_payable_by_svg = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIwLjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkViZW5lXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxODQuMyA3MC45IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAxODQuMyA3MC45OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxnPgoJPHJlY3Qgd2lkdGg9IjguNSIgaGVpZ2h0PSIwLjgiLz4KCTxyZWN0IHg9Ii0zLjkiIHk9IjMuOSIgdHJhbnNmb3JtPSJtYXRyaXgoLTEuODM2OTcwZS0xNiAxIC0xIC0xLjgzNjk3MGUtMTYgNC42MjcgMy44NzcpIiB3aWR0aD0iOC41IiBoZWlnaHQ9IjAuOCIvPgo8L2c+CjxnPgoJPHJlY3QgeD0iLTMuOSIgeT0iNjYuMiIgdHJhbnNmb3JtPSJtYXRyaXgoNi4xMjMyMzRlLTE3IC0xIDEgNi4xMjMyMzRlLTE3IC02Ni4yMzkyIDY2Ljk4OTIpIiB3aWR0aD0iOC41IiBoZWlnaHQ9IjAuOCIvPgoJPHJlY3QgeT0iNzAuMSIgd2lkdGg9IjguNSIgaGVpZ2h0PSIwLjgiLz4KPC9nPgo8Zz4KCTxyZWN0IHg9IjE3NS43IiB5PSI3MC4xIiB0cmFuc2Zvcm09Im1hdHJpeCgtMSAtMS4yMjQ2NDdlLTE2IDEuMjI0NjQ3ZS0xNiAtMSAzNjAgMTQwLjk4MjMpIiB3aWR0aD0iOC41IiBoZWlnaHQ9IjAuOCIvPgoJPHJlY3QgeD0iMTc5LjYiIHk9IjY2LjIiIHRyYW5zZm9ybT0ibWF0cml4KDYuMTIzMjM0ZS0xNyAtMSAxIDYuMTIzMjM0ZS0xNyAxMTcuMjYyOCAyNTAuNDkxMSkiIHdpZHRoPSI4LjUiIGhlaWdodD0iMC44Ii8+CjwvZz4KPGc+Cgk8cmVjdCB4PSIxNzkuNiIgeT0iMy45IiB0cmFuc2Zvcm09Im1hdHJpeCgtMS44MzY5NzBlLTE2IDEgLTEgLTEuODM2OTcwZS0xNiAxODguMTI4OSAtMTc5LjYyNSkiIHdpZHRoPSI4LjUiIGhlaWdodD0iMC44Ii8+Cgk8cmVjdCB4PSIxNzUuNyIgdHJhbnNmb3JtPSJtYXRyaXgoLTEgLTEuMjI0NjQ3ZS0xNiAxLjIyNDY0N2UtMTYgLTEgMzYwIDAuNzUpIiB3aWR0aD0iOC41IiBoZWlnaHQ9IjAuOCIvPgo8L2c+Cjwvc3ZnPgo=";
	this.corner_marks_payment_amount_svg = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIwLjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkViZW5lXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxMTMuNCA0Mi41IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAxMTMuNCA0Mi41OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxnPgoJPGc+CgkJPHJlY3QgeD0iMCIgd2lkdGg9IjguNSIgaGVpZ2h0PSIwLjgiLz4KCTwvZz4KCTxnPgoJCTxyZWN0IHdpZHRoPSIwLjgiIGhlaWdodD0iOC41Ii8+Cgk8L2c+CjwvZz4KPGc+Cgk8Zz4KCQk8cmVjdCB4PSIwIiB5PSI0MS44IiB3aWR0aD0iOC41IiBoZWlnaHQ9IjAuOCIvPgoJPC9nPgoJPGc+CgkJPHJlY3QgeT0iMzQiIHdpZHRoPSIwLjgiIGhlaWdodD0iOC41Ii8+Cgk8L2c+CjwvZz4KPGc+Cgk8Zz4KCQk8cmVjdCB4PSIxMDQuOSIgd2lkdGg9IjguNSIgaGVpZ2h0PSIwLjgiLz4KCTwvZz4KCTxnPgoJCTxyZWN0IHg9IjExMi42IiB5PSIwIiB3aWR0aD0iMC44IiBoZWlnaHQ9IjguNSIvPgoJPC9nPgo8L2c+CjxnPgoJPGc+CgkJPHJlY3QgeD0iMTA0LjkiIHk9IjQxLjgiIHdpZHRoPSI4LjUiIGhlaWdodD0iMC44Ii8+Cgk8L2c+Cgk8Zz4KCQk8cmVjdCB4PSIxMTIuNiIgeT0iMzQiIHdpZHRoPSIwLjgiIGhlaWdodD0iOC41Ii8+Cgk8L2c+CjwvZz4KPC9zdmc+Cg==";
	
	//scissors image
	this.scissors_svg = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA1MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwKSI+CjxyZWN0IHdpZHRoPSI1MCIgaGVpZ2h0PSIyOS45OCIgZmlsbD0id2hpdGUiLz4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAxKSI+CjxwYXRoIGQ9Ik01LjkwODE0IDAuODMwMDc4QzMuNTAwOTIgMS4wNTQ2OSAxLjQyMDg0IDIuNzU4NzkgMC45NDcyMDQgNC44OTc0NkMwLjgyMDI1MSA1LjQ1ODk4IDAuODMwMDE3IDYuNjk0MzQgMC45NjY3MzYgNy4yNDEyMUMxLjQ3NDU1IDkuMjgyMjMgMy4xMDA1MiAxMC45MzI2IDUuMDc4MDYgMTEuNDE2QzUuOTk2MDMgMTEuNjQwNiA2Ljc0Nzk5IDExLjY2OTkgOS45MzY0NiAxMS42MDE2QzEyLjA3MDMgMTEuNTU3NiAxMi41NjgzIDExLjU4MiAxMy41NjkzIDExLjc3MjVDMTUuNDE1IDEyLjEyODkgMTYuODU1NCAxMy4wNTE4IDE3Ljg0NjYgMTQuNTE2NkMxOC4xODM1IDE1LjAxOTUgMTguMTg4NCAxNC45ODA1IDE3Ljc0NDEgMTUuNjU0M0MxNy4zOTI1IDE2LjE4NjUgMTYuNDc0NSAxNy4xMjQgMTUuOTgxNCAxNy40NDYzQzE1LjIxOTcgMTcuOTQ5MiAxNC4zNDA4IDE4LjMwMDggMTMuMzQ5NSAxOC41MDFDMTIuNDE2OSAxOC42OTE0IDExLjg5OTQgMTguNzE1OCA5LjgzODgxIDE4LjY4MTZDOC42MDM0NSAxOC42NjIxIDcuNjgwNiAxOC42NzE5IDcuMzI0MTYgMTguNzA2MUM0LjU5NDY3IDE4Ljk1NTEgMi41MTk0NyAyMC4xNTE0IDEuNjE2MTUgMjEuOTk3MUMxLjAwMDkyIDIzLjI1MiAwLjkwODE0MiAyNC43MTY4IDEuMzY3MTMgMjYuMDg0QzEuNjQ1NDUgMjYuOTA5MiAyLjAxMTY2IDI3LjUxOTUgMi41NzMxOCAyOC4wOTA4QzMuMTM5NTkgMjguNjY3IDMuNzQwMTcgMjkuMDEzNyA0LjY2MzAyIDI5LjI5NjlDNS4zNzEwMyAyOS41MTE3IDUuODgzNzMgMjkuNTg5OCA2LjYzNTY4IDI5LjU4OThDOS4wMTM2MSAyOS41ODk4IDEwLjk5MTEgMjguNDk2MSAxMS44ODk2IDI2LjY4NDZDMTIuMjgwMiAyNS44OTg0IDEyLjM3MyAyNS40OTMyIDEyLjM3MyAyNC41NjA1QzEyLjM3NzkgMjMuNjcxOSAxMi4zMTQ0IDIzLjM4ODcgMTEuODg5NiAyMi4zMjkxQzExLjU1NzYgMjEuNDk5IDExLjQ5NDEgMjEuMjM1NCAxMS41NjczIDIwLjk2MTlDMTEuNjc5NiAyMC41NDIgMTEuOTc3NSAyMC40MTk5IDEzLjY0MjUgMjAuMTEyM0MxNi42MTEzIDE5LjU3MDMgMTguNjU3MiAxOC45NjQ4IDIxLjI0NTEgMTcuODU2NEwyMS43NTc3IDE3LjYzNjdMMzEuNjg0NSAyMS4wOTg2QzQyLjI4NTEgMjQuNzk5OCA0Mi4wOCAyNC43MzE0IDQzLjM4MzcgMjQuODU4NEM0NS4wNjgzIDI1LjAyNDQgNDYuNzg3IDI0LjYzMzggNDcuOTg4MiAyMy44MTg0QzQ4LjQ3MTYgMjMuNDkxMiA0OS4zMTYzIDIyLjczOTMgNDkuMjYyNiAyMi42ODU1QzQ5LjI1MjkgMjIuNjcwOSA0NC43MTY3IDIwLjk3MTcgMzkuMTg0NSAxOC45MDE0QzMzLjY1MjMgMTYuODMxMSAyOS4wNjczIDE1LjEwNzQgMjguOTk0MSAxNS4wNzMyQzI4Ljg3MiAxNS4wMTk1IDI5LjQ3MjYgMTQuNzc1NCAzOC4wMjczIDExLjQyNThDNDkuNzYwNyA2LjgzMTA1IDQ5LjAyMzQgNy4xMjQwMiA0OS4wMjM0IDcuMDcwMzFDNDkuMDIzNCA2Ljk3NzU0IDQ4LjI2NjUgNi4yODkwNiA0Ny44ODA4IDYuMDMwMjdDNDYuOTUzMSA1LjQxNTA0IDQ1LjkwMzMgNS4wODMwMSA0NC41ODQ5IDQuOTgwNDdDNDMuNDY2NyA0Ljg5NzQ2IDQyLjAzMTIgNS4wNjgzNiA0MC44OTM1IDUuNDI0OEM0MC42MjQ5IDUuNTA3ODEgMzYuMjc0MyA3LjEzODY3IDMxLjIyNTUgOS4wNDI5N0MyNi4xNzY3IDEwLjk1MjEgMjIuMDA2OCAxMi41MjQ0IDIxLjk2MjggMTIuNTM5MUMyMS45MTQgMTIuNTQ4OCAyMS42MDE1IDEyLjQyNjggMjEuMjc0NCAxMi4yNjU2QzIwLjE2MTEgMTEuNzE4OCAxOC45NjQ4IDExLjI3OTMgMTcuNjUxMyAxMC45Mzc1QzE2LjU2NzMgMTAuNjU0MyAxNi4xNjIgMTAuNTcxMyAxNC40MzM1IDEwLjI3ODNDMTIuMjA3IDkuODk3NDYgMTEuNzI4NSA5Ljc2MDc0IDExLjQ3OTQgOS40NDMzNkMxMS4yODQxIDkuMTk0MzQgMTEuMzMyOSA4Ljk0NTMxIDExLjcxODcgOC4xNzg3MUMxMS45Nzc1IDcuNjY2MDIgMTIuMDggNy40MDIzNCAxMi4xMzM3IDcuMTE0MjZDMTIuMjIxNiA2LjY2MDE2IDEyLjIzMTQgNS4zODA4NiAxMi4xNTMzIDQuOTUxMTdDMTEuODA2NiAyLjk4ODI4IDEwLjA5MjcgMS4zNzIwNyA3Ljg2MTI3IDAuOTAzMzJDNy40MDcxNiAwLjgwNTY2NCA2LjUxODQ5IDAuNzc2MzY3IDUuOTA4MTQgMC44MzAwNzhaTTcuMzI0MTYgMi42NDY0OEM5LjMzNTg4IDMuMDI3MzQgMTAuNzQyMSA1LjE3MDkgMTAuMzIyMiA3LjIxNjhDMTAuMDU4NSA4LjUxNTYyIDkuMjY3NTIgOS4zNzUgNy45NTg5MiA5Ljc5MDA0QzUuODM0OSAxMC40NTkgMy4yMjc0OCA4Ljk1MDIgMi43Mjk0MyA2Ljc2MjdDMi41NzgwNiA2LjA5Mzc1IDIuNzI0NTUgNS4xMjY5NSAzLjA4NTg4IDQuNDI4NzFDMy43ODQxMiAzLjA4MTA1IDUuNTkwNzYgMi4zMTkzNCA3LjMyNDE2IDIuNjQ2NDhaTTcuODc1OTEgMjAuNTU2NkM4LjA4NTg4IDIwLjYwNTUgOC40NjE4NSAyMC43NTIgOC43MTU3NiAyMC44NzRDOS45NjA4OCAyMS40Njk3IDEwLjYwNTQgMjIuNjM2NyAxMC41MzIyIDI0LjE2NUMxMC40Njg3IDI1LjU3NjIgOS43OTQ4NiAyNi43NjI3IDguNzQwMTcgMjcuMzE0NUM4LjMyNTEzIDI3LjUzNDIgNy40ODUyOSAyNy43Njg2IDYuOTY3NzEgMjcuODEyNUM2LjE5MTM0IDI3Ljg3NiA1LjExNzEzIDI3LjYzMTggNC40NjI4MyAyNy4yNDEyQzQuMDk2NjIgMjcuMDIxNSAzLjYxMzIyIDI2LjU3MjMgMy4zOTM0OSAyNi4yNDUxQzIuNjg1NDkgMjUuMTc1OCAyLjc1ODczIDIzLjYyNzkgMy41NzQxNiAyMi40MDcyQzQuNTU1NiAyMC45MzI2IDYuMzQ3NTkgMjAuMTY2IDcuODc1OTEgMjAuNTU2NloiIGZpbGw9ImJsYWNrIi8+CjwvZz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMCI+CjxyZWN0IHdpZHRoPSI1MCIgaGVpZ2h0PSIyOS45OCIgZmlsbD0id2hpdGUiLz4KPC9jbGlwUGF0aD4KPGNsaXBQYXRoIGlkPSJjbGlwMSI+CjxyZWN0IHdpZHRoPSI1MCIgaGVpZ2h0PSIyOS45ODA1IiBmaWxsPSJ3aGl0ZSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=";
}


QRBill.prototype.getErrorMessage = function (errorId, lang)
{
	if (!lang) {
		lang = 'en';
	}
	switch (errorId) {
		case this.ID_ERR_CURRENCY:
			if (lang === 'it') {
				return "La stampa del QrCode è disponibile solamente per fatture in CHF o EUR";
			} else if (lang === 'fr') {
				return "L'impression du QrCode n'est disponible que pour les factures en CHF ou EUR";
			} else if (lang === 'de') {
				return "QR-Code-Druck ist nur für Rechnungen in CHF oder EUR verfügbar";
			} else {
				return "QrCode printing is only available for invoices in CHF or EUR";
			}
		case this.ID_ERR_QRCODE:
			if (lang === 'it') {
				return "Errore nella creazione del QrCode: %1";
			} else if (lang === 'fr') {
				return "Erreur lors de la création du QrCode : %1";
			} else if (lang === 'de') {
				return "Fehler beim Erstellen des QR-Codes: %1";
			} else {
				return "Error creating QrCode: %1";
			}
		case this.ID_ERR_QRIBAN:
			if (lang === 'it') {
				return "QR-IBAN mancante";
			} else if (lang === 'fr') {
				return "QR-IBAN est manquant";
			} else if (lang === 'de') {
				return "QR-IBAN fehlt";
			} else {
				return "Missing QR-IBAN";
			}
		case this.ID_ERR_QRIBAN_WRONG:
			if (lang === 'it') {
				return "QR-IBAN non corretto";
			} else if (lang === 'fr') {
				return "QR-IBAN est incorrect";
			} else if (lang === 'de') {
				return "Falscher QR-IBAN";
			} else {
				return "Incorrect QR-IBAN";
			}
		case this.ID_ERR_IBAN:
			if (lang === 'it') {
				return "IBAN mancante";
			} else if (lang === 'fr') {
				return "IBAN est manquant";
			} else if (lang === 'de') {
				return "IBAN fehlt";
			} else {
				return "Missing IBAN";
			}
		case this.ID_ERR_IBAN_WRONG:
			if (lang === 'it') {
				return "IBAN non corretto";
			} else if (lang === 'fr') {
				return "IBAN est incorrect";
			} else if (lang === 'de') {
				return "Falscher IBAN";
			} else {
				return "Incorrect IBAN";
			}
		case this.ID_ERR_CREDITORREFERENCE:
			if (lang === 'it') {
				return "Numero di riferimento creditore non valido";
			} else if (lang === 'fr') {
				return "Numéro de référence du créancier non valide";
			} else if (lang === 'de') {
				return "Referenznummer Begünstigter ungültig";
			} else {
				return "Creditor reference number not valid";
			}
		case this.ID_ERR_DEBTOR_NAME:
			if (lang === 'it') {
				return "Indirizzo: nome/società mancante";
			} else if (lang === 'fr') {
				return "Adresse: nom/société est manquant";
			} else if (lang === 'de') {
				return "Adresse: Name/Firma fehlt";
			} else {
				return "Address: missing name/business";
			}
		// case this.ID_ERR_DEBTOR_ADDRESS1:
		// 	if (lang === 'it') {
		// 		return "Indirizzo: indirizzo mancante";
		// 	} else if (lang === 'fr') {
		// 		return "Adresse: adresse est manquante";
		// 	} else if (lang === 'de') {
		// 		return "Adresse: Adresse fehlt";
		// 	} else {
		// 		return "Address: missing address";
		// 	}
		case this.ID_ERR_DEBTOR_POSTALCODE:
			if (lang === 'it') {
				return "Indirizzo: CAP mancante";
			} else if (lang === 'fr') {
				return "Adresse: code postal NPA est manquant";
			} else if (lang === 'de') {
				return "Adresse: PLZ fehlt";
			} else {
				return "Address: missing ZIP code";
			}
		case this.ID_ERR_DEBTOR_CITY:
			if (lang === 'it') {
				return "Indirizzo: località mancante";
			} else if (lang === 'fr') {
				return "Adresse: localité est manquante";
			} else if (lang === 'de') {
				return "Adresse: Ort fehlt";
			} else {
				return "Address: missing locality";
			}
		case this.ID_ERR_DEBTOR_COUNTRY:
			if (lang === 'it') {
				return "Indirizzo: codice nazione mancante";
			} else if (lang === 'fr') {
				return "Adresse: code du pays est manquant";
			} else if (lang === 'de') {
				return "Adresse: Ländercode fehlt";
			} else {
				return "Address: missing country code";
			}
		case this.ID_ERR_DEBTOR_COUNTRY_WRONG:
			if (lang === 'it') {
				return "Indirizzo: codice nazione non corretto";
			} else if (lang === 'fr') {
				return "Adresse: code du pays est incorrect";
			} else if (lang === 'de') {
				return "Adresse: Falscher Ländercode";
			} else {
				return "Address: Incorrect country code";
			}
		case this.ID_ERR_CREDITOR_NAME:
			if (lang === 'it') {
				return "Indirizzo: nome/società mancante";
			} else if (lang === 'fr') {
				return "Adresse: nom/société est manquant";
			} else if (lang === 'de') {
				return "Adresse: Name/Firma fehlt";
			} else {
				return "Address: missing name/business";
			}
		// case this.ID_ERR_CREDITOR_ADDRESS1:
		// 	if (lang === 'it') {
		// 		return "Indirizzo: indirizzo mancante";
		// 	} else if (lang === 'fr') {
		// 		return "Adresse: adresse est manquante";
		// 	} else if (lang === 'de') {
		// 		return "Adresse: Adresse fehlt";
		// 	} else {
		// 		return "Address: missing address";
		// 	}
		case this.ID_ERR_CREDITOR_POSTALCODE:
			if (lang === 'it') {
				return "Indirizzo: CAP mancante";
			} else if (lang === 'fr') {
				return "Adresse: code postal NPA est manquant";
			} else if (lang === 'de') {
				return "Adresse: PLZ fehlt";
			} else {
				return "Address: missing ZIP code";
			}
		case this.ID_ERR_CREDITOR_CITY:
			if (lang === 'it') {
				return "Indirizzo: località mancante";
			} else if (lang === 'fr') {
				return "Adresse: localité est manquante";
			} else if (lang === 'de') {
				return "Adresse: Ort fehlt";
			} else {
				return "Address: missing locality";
			}
		case this.ID_ERR_CREDITOR_COUNTRY:
			if (lang === 'it') {
				return "Indirizzo: codice nazione mancante";
			} else if (lang === 'fr') {
				return "Adresse: code du pays est manquant";
			} else if (lang === 'de') {
				return "Adresse: Ländercode fehlt";
			} else {
				return "Address: missing country code";
			}
		case this.ID_ERR_CREDITOR_COUNTRY_WRONG:
			if (lang === 'it') {
				return "Indirizzo: codice nazione non corretto";
			} else if (lang === 'fr') {
				return "Adresse: code du pays est incorrect";
			} else if (lang === 'de') {
				return "Adresse: Falscher Ländercode";
			} else {
				return "Address: Incorrect country code";
			}
		case this.ID_ERR_CUSTOMER_NUMBER:
			if (lang === 'it') {
				return "Numero cliente troppo lungo, max 7 cifre";
			} else if (lang === 'fr') {
				return "Numéro client trop long, 7 chiffres maximum";
			} else if (lang === 'de') {
				return "Kundennummer zu lang, max. 7 Ziffern";
			} else {
				return "Customer Number too long, max 7 digits";
			}
		case this.ID_ERR_INVOICE_NUMBER:
			if (lang === 'it') {
				return "Numero fattura troppo lungo, max 7 cifre";
			} else if (lang === 'fr') {
				return "Numéro facture trop long, 7 chiffres maximum";
			} else if (lang === 'de') {
				return "Rechnungsnummer zu lang, max. 7 Ziffern";
			} else {
				return "Invoice Number too long, max 7 digits";
			}
	}
	return "";
}


QRBill.prototype.getQrCodeTexts = function(lang)
{
	var text = {}
	switch(lang)
	{
		case 'en':
		{
			text.receiptTitle = "Receipt";
			text.paymentTitle = "Payment part";
			text.payableTo = "Account / Payable to";
			text.payableBy = "Payable by";
			text.payableByBlank = "Payable by (name/address)";
			text.referenceNumber = "Reference";
			text.additionalInformation = "Additional information";
			text.currency = "Currency";
			text.amount = "Amount";
			text.acceptancePoint = "Acceptance point";
			text.nameAV1 = "Name AV1";
			text.nameAV2 = "Name AV2";
			text.separateBeforePaying = "Separate before paying in";
			text.inFavourOf = "In favour of";
			text.notUseForPayment = "DO NOT USE FOR PAYMENT";
			break;
		}
		case 'it':
		{
			text.receiptTitle = "Ricevuta";
			text.paymentTitle = "Sezione pagamento";
			text.payableTo = "Conto / Pagabile a";
			text.payableBy = "Pagabile da";
			text.payableByBlank = "Pagabile da (nome/indirizzo)";
			text.referenceNumber = "Riferimento";
			text.additionalInformation = "Informazioni aggiuntive";
			text.currency = "Valuta";
			text.amount = "Importo";
			text.acceptancePoint = "Punto di accettazione";
			text.nameAV1 = "Nome AV1";
			text.nameAV2 = "Nome AV2";
			text.separateBeforePaying = "Da staccare prima del versamento";
			text.inFavourOf = "A favore di";
			text.notUseForPayment = "NON UTILIZZARE PER IL PAGAMENTO";
			break;
		}
		case 'fr':
		{
			text.receiptTitle = "Récépissé";
			text.paymentTitle = "Section paiement";
			text.payableTo = "Compte / Payable à";
			text.payableBy = "Payable par";
			text.payableByBlank = "Payable par (nom/adresse)";
			text.referenceNumber = "Référence";
			text.additionalInformation = "Informations additionnelles";
			text.currency = "Monnaie";
			text.amount = "Montant";
			text.acceptancePoint = "Point de dépôt";
			text.nameAV1 = "Nom AV1";
			text.nameAV2 = "Nom AV2";
			text.separateBeforePaying = "A détacher avant le versement";
			text.inFavourOf = "En faveur de";
			text.notUseForPayment = "NE PAS UTILISER POUR LE PAIEMENT";
			break;
		}
		case 'de':
		{
			text.receiptTitle = "Empfangsschein";
			text.paymentTitle = "Zahlteil";
			text.payableTo = "Konto / Zahlbar an";
			text.payableBy = "Zahlbar durch";
			text.payableByBlank = "Zahlbar durch (Name/Adresse)";
			text.referenceNumber = "Referenz";
			text.additionalInformation = "Zusätzliche Informationen";
			text.currency = "Währung";
			text.amount = "Betrag";
			text.acceptancePoint = "Annahmestelle";
			text.nameAV1 = "Name AV1";
			text.nameAV2 = "Name AV2";
			text.separateBeforePaying = "Vor der Einzahlung abzutrennen";
			text.inFavourOf = "Zugunsten";
			text.notUseForPayment = "NICHT ZUR ZAHLUNG VERWENDEN";
			break;
		}
		default:
		{
			text.receiptTitle = "Receipt";
			text.paymentTitle = "Payment part";
			text.payableTo = "Account / Payable to";
			text.payableBy = "Payable by";
			text.payableByBlank = "Payable by (name/address)";
			text.referenceNumber = "Reference";
			text.additionalInformation = "Additional information";
			text.currency = "Currency";
			text.amount = "Amount";
			text.acceptancePoint = "Acceptance point";
			text.nameAV1 = "Name AV1";
			text.nameAV2 = "Name AV2";
			text.separateBeforePaying = "Separate before paying in";
			text.inFavourOf = "In favour of";
			text.notUseForPayment = "DO NOT USE FOR PAYMENT";
			break;
		}
	}
	return text;
}


QRBill.prototype.defineQrBillType = function(invoiceObj, userParam)
{
	/**
	*	Define the QR-bill case (QRIBAN+QRR or IBAN+SCOR or IBAN without reference)
	*/

	if (userParam.qr_code_reference_type === "QRR") {
		this.ID_QRBILL_WITH_QRIBAN_AND_QRR = true;
	}
	else if (userParam.qr_code_reference_type === "SCOR") {
		this.ID_QRBILL_WITH_IBAN_AND_SCOR = true;
	}
	else if (userParam.qr_code_reference_type === "NON") {
		this.ID_QRBILL_WITH_IBAN_WITHOUT_REFERENCE = true;
	}


	/**
	*	Define when the QR-bill is with/without debtor and amount
	*/

	//user selected empty address
	if (userParam.qr_code_empty_address) {
		this.ID_QRBILL_WITHOUT_DEBTOR = true;
	}

	//user selected empty amount
	if (userParam.qr_code_empty_amount) {
		this.ID_QRBILL_WITHOUT_AMOUNT = true;
	}
	

	//Banana.console.log("ID_QRBILL_WITH_QRIBAN_AND_QRR = " + this.ID_QRBILL_WITH_QRIBAN_AND_QRR);
	//Banana.console.log("ID_QRBILL_WITH_IBAN_AND_SCOR = " + this.ID_QRBILL_WITH_IBAN_AND_SCOR);
	//Banana.console.log("ID_QRBILL_WITH_IBAN_WITHOUT_REFERENCE = " + this.ID_QRBILL_WITH_IBAN_WITHOUT_REFERENCE);
	//Banana.console.log("ID_QRBILL_WITHOUT_AMOUNT = " + this.ID_QRBILL_WITHOUT_AMOUNT);
	//Banana.console.log("ID_QRBILL_WITHOUT_DEBTOR = " + this.ID_QRBILL_WITHOUT_DEBTOR);
}


QRBill.prototype.getQrCodeData = function(invoiceObj, userParam, texts, langDoc)
{
	/**
	*	Set all the QRCode data that are used to create the qr image and receipt/payment slip
	*/

	//Check if an IBAN exists on address property.
	//If no IBAN is defined in settings dialog, and an IBAN is defined on Address property, we use it.
	//If an IBAN is defined in settings dialog, we always use it.
	if (!userParam.qr_code_iban && invoiceObj.supplier_info.iban_number) {
		userParam.qr_code_iban = invoiceObj.supplier_info.iban_number;
	}

	var qrcodeData = {};
	qrcodeData.supplierIbanNumber = "";
	qrcodeData.reference = "";

	if (this.ID_QRBILL_WITH_QRIBAN_AND_QRR) 
	{
		if (userParam.qr_code_qriban) {
			qrcodeData.supplierIbanNumber = this.formatIban(userParam.qr_code_qriban);
			
			if (isValidIBAN(userParam.qr_code_qriban) !== 1 || !isQRIBAN(userParam.qr_code_qriban)) {
				qrcodeData.supplierIbanNumber = "@error " + this.getErrorMessage(this.ID_ERR_QRIBAN_WRONG, langDoc);
			}

		} else {
			qrcodeData.supplierIbanNumber = "@error " + this.getErrorMessage(this.ID_ERR_QRIBAN, langDoc);
			//var msg = this.getErrorMessage(this.ID_ERR_QRIBAN, langDoc);
			//this.banDoc.addMessage(msg, this.ID_ERR_QRIBAN);
		}

		qrcodeData.reference = this.qrReferenceString(userParam.qr_code_isr_id, invoiceObj.customer_info.number, invoiceObj.document_info.number.replace(/[^0-9a-zA-Z]+/g, ""));
		// if (userParam.qr_code_isr_id) {
		// 	qrcodeData.reference = this.qrReferenceString(userParam.qr_code_isr_id, invoiceObj.customer_info.number, invoiceObj.document_info.number.replace(/[^0-9a-zA-Z]+/g, ""));
		// } else {
		// 	qrcodeData.reference = "@error " + this.getErrorMessage(this.ID_ERR_QRREFERENCE, langDoc);
		// 	//var msg = this.getErrorMessage(this.ID_ERR_QRREFERENCE, langDoc);
		// 	//this.banDoc.addMessage(msg, this.ID_ERR_QRREFERENCE);
		// }

	}
	else if (this.ID_QRBILL_WITH_IBAN_AND_SCOR || this.ID_QRBILL_WITH_IBAN_WITHOUT_REFERENCE) 
	{	
		if (userParam.qr_code_iban || userParam.qr_code_iban_eur) {
			if (userParam.qr_code_iban) {
				qrcodeData.supplierIbanNumber = this.formatIban(userParam.qr_code_iban);

				if (isValidIBAN(userParam.qr_code_iban) !== 1 || isQRIBAN(userParam.qr_code_iban)) { //|| invoiceObj.document_info.currency !== "CHF" && invoiceObj.document_info.currency !== "chf") {
					qrcodeData.supplierIbanNumber = "@error " + this.getErrorMessage(this.ID_ERR_IBAN_WRONG, langDoc);
				}
			}
			if (userParam.qr_code_iban_eur) {
				qrcodeData.supplierIbanNumber = this.formatIban(userParam.qr_code_iban_eur);

				if (isValidIBAN(userParam.qr_code_iban_eur) !== 1 || isQRIBAN(userParam.qr_code_iban_eur)) { // || invoiceObj.document_info.currency !== "EUR" && invoiceObj.document_info.currency !== "eur") {
					qrcodeData.supplierIbanNumber = "@error " + this.getErrorMessage(this.ID_ERR_IBAN_WRONG, langDoc);
				}
			}
		}
		else {
			qrcodeData.supplierIbanNumber = "@error " + this.getErrorMessage(this.ID_ERR_IBAN, langDoc);
			//var msg = this.getErrorMessage(this.ID_ERR_IBAN, langDoc);
			//this.banDoc.addMessage(msg, this.ID_ERR_IBAN);
		}

		if (userParam.qr_code_reference_type === "SCOR") {

			var customerNumber = this.convertRfNumbers(invoiceObj.customer_info.number);
			var invoiceNumber = this.convertRfNumbers(invoiceObj.document_info.number);
			
			if (customerNumber === "@error" || invoiceNumber === "@error") {
				if (customerNumber === "@error") {
					qrcodeData.reference += "@error " + this.getErrorMessage(this.ID_ERR_CUSTOMER_NUMBER, langDoc);
				}
				if (invoiceNumber === "@error") {
					if (customerNumber === "@error") {
						qrcodeData.reference += "\n";
					}
					qrcodeData.reference += "@error " + this.getErrorMessage(this.ID_ERR_INVOICE_NUMBER, langDoc);
				}
			}
			else {
				qrcodeData.reference = this.qrCreditorReference(customerNumber, invoiceNumber);
			}
			
			// reference is false => it's not valid
			if (!qrcodeData.reference) {
				qrcodeData.reference = "@error " + this.getErrorMessage(this.ID_ERR_CREDITORREFERENCE, langDoc);
				//var msg = this.getErrorMessage(this.ID_ERR_CREDITORREFERENCE, langDoc);
				//this.banDoc.addMessage(msg, this.ID_ERR_CREDITORREFERENCE);
			}
		}
	}

	/* Currency and amount */
	qrcodeData.currency = invoiceObj.document_info.currency.toUpperCase();
	qrcodeData.amount = invoiceObj.billing_info.total_to_pay;
	if (!qrcodeData.amount || Banana.SDecimal.sign(qrcodeData.amount) < 0) {
		qrcodeData.amount = "0.00";
	}


	/* Creditor (Payable to) */
	qrcodeData.creditorName = "";
	qrcodeData.creditorAddress1 = "";
	qrcodeData.creditorAddress2 = "";
	qrcodeData.creditorPostalcode = "";
	qrcodeData.creditorCity = "";
	qrcodeData.creditorCountry = "";

	if (invoiceObj.supplier_info.business_name) {
		qrcodeData.creditorName += invoiceObj.supplier_info.business_name;
	} else {
		if (invoiceObj.supplier_info.first_name) {
			qrcodeData.creditorName += invoiceObj.supplier_info.first_name;
		}
		if (invoiceObj.supplier_info.last_name) {
			qrcodeData.creditorName += " " + invoiceObj.supplier_info.last_name;
		}		
	}
	if (invoiceObj.supplier_info.address1) {
		qrcodeData.creditorAddress1 = invoiceObj.supplier_info.address1;
	}
	// if (invoiceObj.supplier_info.address2) {
	// 	qrcodeData.creditorAddress2 = invoiceObj.supplier_info.address2;
	// }
	if (invoiceObj.supplier_info.postal_code) {
		qrcodeData.creditorPostalcode = invoiceObj.supplier_info.postal_code;
	}
	if (invoiceObj.supplier_info.city) {
		qrcodeData.creditorCity = invoiceObj.supplier_info.city;
	}
	if (invoiceObj.supplier_info.country_code) {
		qrcodeData.creditorCountry = invoiceObj.supplier_info.country_code.toUpperCase();
	}
	else {
		if (invoiceObj.supplier_info.country) {
			if (isSwissCountry(invoiceObj.supplier_info.country)) {
				qrcodeData.creditorCountry = "CH";
			} else {
				qrcodeData.creditorCountry = invoiceObj.supplier_info.country.toUpperCase();
			}
		}
	}

	//Replace the default values using the "Payable to" address parameters
	if (userParam.qr_code_payable_to) {
		if (userParam.qr_code_creditor_name) {
			qrcodeData.creditorName = userParam.qr_code_creditor_name;
		}
		if (userParam.qr_code_creditor_address1) {
			qrcodeData.creditorAddress1 = userParam.qr_code_creditor_address1;
		}
		// if (userParam.qr_code_creditor_address2) {
		// 	qrcodeData.creditorAddress2 = userParam.qr_code_creditor_address2;
		// }
		if (userParam.qr_code_creditor_postalcode) {
			qrcodeData.creditorPostalcode = userParam.qr_code_creditor_postalcode;
		}
		if (userParam.qr_code_creditor_city) {
			qrcodeData.creditorCity = userParam.qr_code_creditor_city;
		}
		if (userParam.qr_code_creditor_country) {
			qrcodeData.creditorCountry = userParam.qr_code_creditor_country.toUpperCase();
		}
	}
	

	if (!qrcodeData.creditorName) {
		qrcodeData.creditorName = "@error " + this.getErrorMessage(this.ID_ERR_CREDITOR_NAME, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_CREDITOR_NAME, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_CREDITOR_NAME);	
	}
	if (!qrcodeData.creditorAddress1) {
		//creditorAddress1 can ben empty
		//qrcodeData.creditorAddress1 = "@error " + this.getErrorMessage(this.ID_ERR_CREDITOR_ADDRESS1, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_CREDITOR_ADDRESS1, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_CREDITOR_ADDRESS1);	
	}
	if (!qrcodeData.creditorPostalcode) {
		qrcodeData.creditorPostalcode = "@error " + this.getErrorMessage(this.ID_ERR_CREDITOR_POSTALCODE, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_CREDITOR_POSTALCODE, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_CREDITOR_POSTALCODE);	
	}
	if (!qrcodeData.creditorCity) {
		qrcodeData.creditorCity = "@error " + this.getErrorMessage(this.ID_ERR_CREDITOR_CITY, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_CREDITOR_CITY, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_CREDITOR_CITY);	
	}
	if (!qrcodeData.creditorCountry) {
		qrcodeData.creditorCountry = "@error " + this.getErrorMessage(this.ID_ERR_CREDITOR_COUNTRY, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_CREDITOR_COUNTRY, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_CREDITOR_COUNTRY);
	}
	else if (!isValidCountryCode(qrcodeData.creditorCountry)) {
		qrcodeData.creditorCountry = "@error " + this.getErrorMessage(this.ID_ERR_CREDITOR_COUNTRY_WRONG, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_CREDITOR_COUNTRY_WRONG, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_CREDITOR_COUNTRY_WRONG);
	}


	/* 
	    Additional information => unstructured message (es. Order of 15 June 2020) 
	    Billing information => structured message (es. //S1/10/10201409/11/200701/20/140.000-53/30/102673831/31/200615/32/7.7/33/7.7:139.40/40/0:30)
	*/
	if (qrcodeData.amount === "0.00") { //when amount is 0, add only additional info with text "NOT TO PAY.."
		qrcodeData.additionalInformation = "";
		if(!userParam.qr_code_empty_amount) { //only if "Empty amount" option is false
			qrcodeData.additionalInformation = texts.notUseForPayment;
		}
		qrcodeData.billingInformation = "";
	} 
	else if (this.ID_QRBILL_WITHOUT_DEBTOR) { //when no debtor, add only billing information
		qrcodeData.additionalInformation = "";
		if (userParam.qr_code_billing_information) {
			qrcodeData.billingInformation = this.qrBillingInformation(invoiceObj);
		} else {
			qrcodeData.billingInformation = "";
		}
	}
	else { //add both additional and billing information
		qrcodeData.additionalInformation = this.qrAdditionalInformation(invoiceObj, userParam.qr_code_additional_information);
		if (userParam.qr_code_billing_information) {
			qrcodeData.billingInformation = this.qrBillingInformation(invoiceObj);
		} else {
			qrcodeData.billingInformation = "";
		}
	}
	
	// Additional and billing inforomation must be together max 140 characters.
	// We cut the unstructured Additional information with "..." at the end
	var str = qrcodeData.additionalInformation + qrcodeData.billingInformation;
	if (str.length > 140) {
		str = str.split("//");
		var addInfo = str[0];
		var billInfo = "//"+str[1];
		qrcodeData.additionalInformation = addInfo.substring(0, (137-(billInfo.length)))+ "...";
	}

	/* Debtor (Payable by) */
	qrcodeData.debtorName = "";
	qrcodeData.debtorAddress1 = "";
	qrcodeData.debtorAddress2 = "";
	qrcodeData.debtorPostalcode = "";
	qrcodeData.debtorCity = "";
	qrcodeData.debtorCountry = "";

	if (invoiceObj.customer_info.business_name) {
		qrcodeData.debtorName += invoiceObj.customer_info.business_name;
	} else {
		if (invoiceObj.customer_info.first_name || invoiceObj.customer_info.last_name) {
			if (invoiceObj.customer_info.first_name) {
				qrcodeData.debtorName += invoiceObj.customer_info.first_name;
			}
			if (invoiceObj.customer_info.last_name) {
				if (invoiceObj.customer_info.first_name) {
					qrcodeData.debtorName += " ";
				}
				qrcodeData.debtorName += invoiceObj.customer_info.last_name;
			}
		}		
	}
	if (invoiceObj.customer_info.address1) {
		qrcodeData.debtorAddress1 = invoiceObj.customer_info.address1;
	}
	// if (invoiceObj.customer_info.address2) {
	// 	qrcodeData.debtorAddress2 = invoiceObj.customer_info.address2;
	// }
	if (invoiceObj.customer_info.postal_code) {
		qrcodeData.debtorPostalcode = invoiceObj.customer_info.postal_code;
	}
	if (invoiceObj.customer_info.city) {
		qrcodeData.debtorCity = invoiceObj.customer_info.city;
	}

	// Country code "10:adr:cco" of Transactions table will be available with the new Experimental.
	// At the moment we use the country "10:adr:cou"
	if (invoiceObj.customer_info.country_code) {
		qrcodeData.debtorCountry = invoiceObj.customer_info.country_code.toUpperCase(); 
	} 
	else if (!invoiceObj.customer_info.country_code && invoiceObj.customer_info.country) {
		qrcodeData.debtorCountry = invoiceObj.customer_info.country.toUpperCase();
	}

	if (!qrcodeData.debtorName) {
		qrcodeData.debtorName = "@error " + this.getErrorMessage(this.ID_ERR_DEBTOR_NAME, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_DEBTOR_NAME, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_DEBTOR_NAME);	
	}
	if (!qrcodeData.debtorAddress1) {
		//debtorAddress1 can ben empty
		//qrcodeData.debtorAddress1 = "@error " + this.getErrorMessage(this.ID_ERR_DEBTOR_ADDRESS1, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_DEBTOR_ADDRESS1, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_DEBTOR_ADDRESS1);	
	}
	if (!qrcodeData.debtorPostalcode) {
		qrcodeData.debtorPostalcode = "@error " + this.getErrorMessage(this.ID_ERR_DEBTOR_POSTALCODE, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_DEBTOR_POSTALCODE, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_DEBTOR_POSTALCODE);	
	}
	if (!qrcodeData.debtorCity) {
		qrcodeData.debtorCity = "@error " + this.getErrorMessage(this.ID_ERR_DEBTOR_CITY, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_DEBTOR_CITY, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_DEBTOR_CITY);	
	}
	if (!qrcodeData.debtorCountry) {
		qrcodeData.debtorCountry = "@error " + this.getErrorMessage(this.ID_ERR_DEBTOR_COUNTRY, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_DEBTOR_COUNTRY, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_DEBTOR_COUNTRY);
	}
	else if (!isValidCountryCode(qrcodeData.debtorCountry)) {
		qrcodeData.debtorCountry = "@error " + this.getErrorMessage(this.ID_ERR_DEBTOR_COUNTRY_WRONG, langDoc);
		//var msg = this.getErrorMessage(this.ID_ERR_DEBTOR_COUNTRY_WRONG, langDoc);
		//this.banDoc.addMessage(msg, this.ID_ERR_DEBTOR_COUNTRY_WRONG);
	}

	/* Further information */
	qrcodeData.furtherInformation1 = "";//"UV;UltraPay005;12345";
	qrcodeData.furtherInformation2 = "";//"XY;XYService;54321";

	return qrcodeData;
}



QRBill.prototype.createTextQrImage = function(qrcodeData, texts)
{
	var qrImageText = {};
	qrImageText.qrtype = "";
	qrImageText.version = "";
	qrImageText.codingtype = "";
	qrImageText.account = "";
	qrImageText.craddresstype = "";
	qrImageText.crname = "";
	qrImageText.craddress1 = "";
	qrImageText.craddress2 = "";
	qrImageText.crpostalcode = "";
	qrImageText.crcity = "";
	qrImageText.crcountry = "";
	qrImageText.ucraddresstype = "";
	qrImageText.ucrname = "";
	qrImageText.ucraddress1 = "";
	qrImageText.ucraddress2 = "";
	qrImageText.ucrpostalcode = "";
	qrImageText.ucrcity = "";
	qrImageText.ucrcountry = "";
	qrImageText.amount = "";
	qrImageText.currency = "";
	qrImageText.udaddresstype = "";
	qrImageText.udname = "";
	qrImageText.udaddress1 = "";
	qrImageText.udaddress2 = "";
	qrImageText.udpostalcode = "";
	qrImageText.udcity = "";
	qrImageText.udcountry = "";
	qrImageText.referencetype = "";
	qrImageText.reference = "";
	qrImageText.unstructuredmessage = "";
	qrImageText.trailer = "";
	qrImageText.billinginformation = "";
	qrImageText.av1parameters = "";
	qrImageText.av2parameters = "";



	//initialize qr text
	qrImageText.qrtype = "SPC"; //Swiss Payments Code
	qrImageText.version = "0200"; //Version 2.0 (02=version; 00=subversion)
	qrImageText.codingtype = "1"; //Fixed value 1 (indicates UTF-8 restricted to the Latin character set)
	if (qrcodeData.supplierIbanNumber) {
		qrImageText.account = qrcodeData.supplierIbanNumber.replace(/ /g, ""); //Fixed length: 21 alphanumeric characters, only IBANs with CH or LI country code permitted
	}
	qrImageText.craddresstype = "K"; // we use combined address
	// if (qrImageText.craddresstype === "S") { //S=structured address
	// 	qrImageText.crname = qrcodeData.creditorName;
	// 	qrImageText.craddress1 = qrcodeData.creditorAddress1;
	// 	qrImageText.craddress2 = qrcodeData.creditorAddress2;
	// 	qrImageText.crpostalcode = qrcodeData.creditorPostalcode;
	// 	qrImageText.crcity = qrcodeData.creditorCity;	
	// }
	// else if (qrImageText.craddresstype === "K") { //K=combined address
		qrImageText.crname = qrcodeData.creditorName;
		qrImageText.craddress1 = qrcodeData.creditorAddress1;
		qrImageText.craddress2 = qrcodeData.creditorPostalcode + " " + qrcodeData.creditorCity;
		qrImageText.crpostalcode = "";
		qrImageText.crcity = "";
	// }
	qrImageText.crcountry = qrcodeData.creditorCountry; //Two-digit country code according to ISO 3166-1
	qrImageText.trailer = "EPD";
	
	if (!this.ID_QRBILL_WITHOUT_AMOUNT) {
		qrImageText.amount = qrcodeData.amount;
	}
	
	qrImageText.currency = qrcodeData.currency; //Only CHF and EUR are permitted


	// QRR and SCOR with the reference number, NON without reference number
	if (this.ID_QRBILL_WITH_QRIBAN_AND_QRR) {
		qrImageText.referencetype = "QRR"
		qrImageText.reference = qrcodeData.reference.replace(/ /g, "");
	} 
	else if (this.ID_QRBILL_WITH_IBAN_AND_SCOR) {
		qrImageText.referencetype = "SCOR";
		qrImageText.reference = qrcodeData.reference.replace(/ /g, "");
	} 
	else if (this.ID_QRBILL_WITH_IBAN_WITHOUT_REFERENCE) {
		qrImageText.referencetype = "NON";
	}


	// Debtor address if exists
	if (!this.ID_QRBILL_WITHOUT_DEBTOR) {
		qrImageText.udaddresstype = "K"; // we use combined address
		// if (qrImageText.udaddresstype === "S") { //S=structured address
		// 	qrImageText.udname = qrcodeData.debtorName;
		// 	qrImageText.udaddress1 = qrcodeData.debtorAddress1;
		// 	qrImageText.udaddress2 = qrcodeData.debtorAddress2;
		// 	qrImageText.udpostalcode = qrcodeData.debtorPostalcode;
		// 	qrImageText.udcity = qrcodeData.debtorCity;
		// }
		// else if (qrImageText.udaddresstype === "K") { //K=combined address
			qrImageText.udname = qrcodeData.debtorName;
			qrImageText.udaddress1 = qrcodeData.debtorAddress1;
			qrImageText.udaddress2 = qrcodeData.debtorPostalcode + " " + qrcodeData.debtorCity;
			qrImageText.udpostalcode = "";
			qrImageText.udcity = "";
		// }
		qrImageText.udcountry = qrcodeData.debtorCountry;
	}

	if (qrcodeData.additionalInformation) {
		qrImageText.unstructuredmessage = qrcodeData.additionalInformation;
	}
	if (qrcodeData.billingInformation) {
		qrImageText.billinginformation = qrcodeData.billingInformation;
	}

	if (qrcodeData.amount !== "0.00" && qrcodeData.furtherInformation1) {
		qrImageText.av1parameters = texts.nameAV1+": "+qrcodeData.furtherInformation1;
	}
	if (qrcodeData.amount !== "0.00" && qrcodeData.furtherInformation2) {
		qrImageText.av2parameters = texts.nameAV2+": "+qrcodeData.furtherInformation2;	
	}



	// Create the text for the QR image
	var text = "";
	text += qrImageText.qrtype + "\n";
	text += qrImageText.version + "\n";
	text += qrImageText.codingtype + "\n";
	text += qrImageText.account + "\n";
	text += qrImageText.craddresstype + "\n";
	text += qrImageText.crname + "\n";
	text += qrImageText.craddress1 + "\n";
	text += qrImageText.craddress2 + "\n";
	text += qrImageText.crpostalcode + "\n";
	text += qrImageText.crcity + "\n";
	text += qrImageText.crcountry + "\n";
	text += qrImageText.ucraddresstype + "\n";
	text += qrImageText.ucrname + "\n";
	text += qrImageText.ucraddress1 + "\n";
	text += qrImageText.ucraddress2 + "\n";
	text += qrImageText.ucrpostalcode + "\n";
	text += qrImageText.ucrcity + "\n";
	text += qrImageText.ucrcountry + "\n";
	text += qrImageText.amount + "\n";
	text += qrImageText.currency + "\n";
	text += qrImageText.udaddresstype + "\n";
	text += qrImageText.udname + "\n";
	text += qrImageText.udaddress1 + "\n";
	text += qrImageText.udaddress2 + "\n";
	text += qrImageText.udpostalcode + "\n";
	text += qrImageText.udcity + "\n";
	text += qrImageText.udcountry + "\n";
	text += qrImageText.referencetype + "\n";
	text += qrImageText.reference + "\n";
	text += qrImageText.unstructuredmessage + "\n";
	text += qrImageText.trailer + "\n";
	text += qrImageText.billinginformation + "\n";
	text += qrImageText.av1parameters + "\n";
	text += qrImageText.av2parameters;

	//Banana.console.log("\n------------ QR CODE IMAGE BEGIN ------------");
	//Banana.console.log(text);
	//Banana.console.log("------------ QR CODE IMAGE END ------------");

	return text;
}

QRBill.prototype.createQrImage = function(qrcodeText, texts, langDoc)
{
	// Create the QRCode image with the text
	var qrCodeParam = {};
	qrCodeParam.errorCorrectionLevel = 'M';
	qrCodeParam.binaryCodingVersion = 25;
	qrCodeParam.border = 0;

	var qrCodeSvgImage = Banana.Report.qrCodeImage(qrcodeText, qrCodeParam);
	if (qrCodeParam.errorMsg && qrCodeParam.errorMsg.length > 0) {
		var msg = this.getErrorMessage(this.ID_ERR_QRCODE, langDoc);
		msg = msg.replace("%1", qrCodeParam.errorMsg);
		if (this.banDoc) {
			this.banDoc.addMessage(msg, this.ID_ERR_QRCODE);
		} else {
			throw new Error(msg + " (" + this.ID_ERR_QRCODE + ")");
		}
	}

	return qrCodeSvgImage;
}


QRBill.prototype.createQrForm = function(repDocObj, qrcodeData, qrCodeSvgImage, userParam, texts)
{
	if (userParam.qr_code_new_page) {
		repDocObj.addPageBreak();
	}
	repDocObj.addParagraph("", "rectangle"); //rettangolo trasparente per non sovrascrivere il testo con il QRCode

	// QRCode Receipt/Payment sections
	var qrcodeReceiptForm = repDocObj.addSection("qrcode_receipt_Form");
	var qrcodeReceiptCurrencyForm = repDocObj.addSection("qrcode_receipt_currency_Form");
	var qrcodeReceiptAmountForm = repDocObj.addSection("qrcode_receipt_amount_Form");
	var qrcodeReceiptAcceptancePointForm = repDocObj.addSection("qrcode_receipt_acceptancepoint_Form");
	var qrcodePaymentForm = repDocObj.addSection("qrcode_payment_Form");
	var qrcodePymentImageForm = repDocObj.addSection("qrcode_payment_image_Form");
	var qrcodePaymentCurrencyForm = repDocObj.addSection("qrcode_payment_currency_Form");
	var qrcodePaymentAmountForm = repDocObj.addSection("qrcode_payment_amount_Form");
	var qrcodePaymentTextForm = repDocObj.addSection("qrcode_payment_text_Form");
	var qrcodePaymentFurtherInfoForm = repDocObj.addSection("qrcode_payment_further_info_Form");

	// Scissors symbol on line separator
	if (userParam.qr_code_add_symbol_scissors) {
		repDocObj.addImage(this.scissors_svg,"scissors");
	}


	/**
	*	RECEIPT TEXT
	*/
	qrcodeReceiptForm.addParagraph(texts.receiptTitle, "title paddingTop");
	qrcodeReceiptForm.addParagraph(" ", " lineSpacing9");
	qrcodeReceiptForm.addParagraph(texts.payableTo, "heading_receipt lineSpacing9");

	if (qrcodeData.supplierIbanNumber.indexOf("@error") > -1) {
		qrcodeReceiptForm.addParagraph(qrcodeData.supplierIbanNumber, "value_receipt error lineSpacing9");
	} else {
		qrcodeReceiptForm.addParagraph(qrcodeData.supplierIbanNumber, "value_receipt lineSpacing9");
	}

	if (qrcodeData.creditorName.indexOf("@error") > -1) {
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorName, "value_receipt error lineSpacing9");
	} else {
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorName, "value_receipt lineSpacing9");
	}
	
	if (qrcodeData.creditorAddress1.indexOf("@error") > -1) {
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorAddress1, "value_receipt error lineSpacing9");
	} else {
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorAddress1, "value_receipt lineSpacing9");
	}

	// if (qrcodeData.creditorAddress2.indexOf("@error") > -1) {
	// 	qrcodeReceiptForm.addParagraph(qrcodeData.creditorAddress2, "value_receipt error lineSpacing9");
	// } else {
	// 	qrcodeReceiptForm.addParagraph(qrcodeData.creditorAddress2, "value_receipt lineSpacing9");
	// }

	if (qrcodeData.creditorPostalcode.indexOf("@error") < 0 && qrcodeData.creditorCity.indexOf("@error") < 0) {
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorPostalcode + " " + qrcodeData.creditorCity, "value_receipt lineSpacing9");
	} else if (qrcodeData.creditorPostalcode.indexOf("@error") < 0 && qrcodeData.creditorCity.indexOf("@error") > -1) {
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorPostalcode, "value_receipt lineSpacing9");
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorCity, "value_receipt error lineSpacing9");
	} else if (qrcodeData.creditorPostalcode.indexOf("@error") > -1 && qrcodeData.creditorCity.indexOf("@error") < 0) {
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorPostalcode, "value_receipt error lineSpacing9");
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorCity, "value_receipt lineSpacing9");
	} else if (qrcodeData.creditorPostalcode.indexOf("@error") > -1 && qrcodeData.creditorCity.indexOf("@error") > -1) {
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorPostalcode, "value_receipt error lineSpacing9");
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorCity, "value_receipt error lineSpacing9");
	}

	if (qrcodeData.creditorCountry.indexOf("@error") > -1) {
		qrcodeReceiptForm.addParagraph(qrcodeData.creditorCountry, "value_receipt error lineSpacing9");
	}

	qrcodeReceiptForm.addParagraph(" ","");

	if (qrcodeData.reference) {
		qrcodeReceiptForm.addParagraph(texts.referenceNumber,"heading_receipt lineSpacing9");
		if (qrcodeData.reference.indexOf("@error") > -1) { //print the reference in red
			qrcodeReceiptForm.addParagraph(qrcodeData.reference,"value_receipt error lineSpacing9");
		} else {
			qrcodeReceiptForm.addParagraph(qrcodeData.reference,"value_receipt lineSpacing9");
		}
		qrcodeReceiptForm.addParagraph(" ","lineSpacing9");
	}

	if (this.ID_QRBILL_WITHOUT_DEBTOR) {
		qrcodeReceiptForm.addParagraph(texts.payableByBlank,"heading_receipt lineSpacing9");
		qrcodeReceiptForm.addImage(this.corner_marks_receipt_payable_by_svg, "corner_marks_receipt_payable_by");
	}
	else {
		qrcodeReceiptForm.addParagraph(texts.payableBy,"heading_receipt lineSpacing9");
		
		if (qrcodeData.debtorName.indexOf("@error") > -1) {
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorName, "value_receipt error lineSpacing9");
		} else {
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorName, "value_receipt lineSpacing9");
		}
		
		if (qrcodeData.debtorAddress1.indexOf("@error") > -1) {
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorAddress1, "value_receipt error lineSpacing9");
		} else {
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorAddress1, "value_receipt lineSpacing9");
		}

		// if (qrcodeData.debtorAddress2.indexOf("@error") > -1) {
		// 	qrcodeReceiptForm.addParagraph(qrcodeData.debtorAddress2, "value_receipt error lineSpacing9");
		// } else {
		// 	qrcodeReceiptForm.addParagraph(qrcodeData.debtorAddress2, "value_receipt lineSpacing9");
		// }

		if (qrcodeData.debtorPostalcode.indexOf("@error") < 0 && qrcodeData.debtorCity.indexOf("@error") < 0) {
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorPostalcode + " " + qrcodeData.debtorCity, "value_receipt lineSpacing9");
		} else if (qrcodeData.debtorPostalcode.indexOf("@error") < 0 && qrcodeData.debtorCity.indexOf("@error") > -1) {
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorPostalcode, "value_receipt lineSpacing9");
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorCity, "value_receipt error lineSpacing9");
		} else if (qrcodeData.debtorPostalcode.indexOf("@error") > -1 && qrcodeData.debtorCity.indexOf("@error") < 0) {
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorPostalcode, "value_receipt error lineSpacing9");
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorCity, "value_receipt lineSpacing9");
		} else if (qrcodeData.debtorPostalcode.indexOf("@error") > -1 && qrcodeData.debtorCity.indexOf("@error") > -1) {
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorPostalcode, "value_receipt error lineSpacing9");
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorCity, "value_receipt error lineSpacing9");
		}

		if (qrcodeData.debtorCountry.indexOf("@error") > -1) {
			qrcodeReceiptForm.addParagraph(qrcodeData.debtorCountry, "value_receipt error lineSpacing9");
		}
	}
	

	/**
	*	RECEIPT CURRENCY AND AMOUNT
	*/
	qrcodeReceiptCurrencyForm.addParagraph(texts.currency, "heading_receipt");
	qrcodeReceiptCurrencyForm.addParagraph(qrcodeData.currency, "amount_receipt");
	qrcodeReceiptAmountForm.addParagraph(texts.amount, "heading_receipt");
	if (this.ID_QRBILL_WITHOUT_AMOUNT) {
		qrcodeReceiptAmountForm.addImage(this.corner_marks_receipt_amount_svg, "corner_marks_receipt_amount");
	} else {
		qrcodeReceiptAmountForm.addParagraph(qrcodeData.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "),"amount_receipt"); //thousands separator blank
	}


	/**
	*	RECEIPT ACCEPTANCE POINT
	*/
	qrcodeReceiptAcceptancePointForm.addParagraph(texts.acceptancePoint, "acceptance_point alignRight paddingRight");


	/**
	*	PAYMENT QRCODE
	*/
	qrcodePaymentForm.addParagraph(texts.paymentTitle, "title paddingTop paddingLeft");
	qrcodePymentImageForm.addImage(qrCodeSvgImage, 'qr_code_image');
	qrcodePymentImageForm.addImage(this.swiss_cross, "qrcode_cross");


	/**
	*	PAYMENT CURRENCY AND AMOUNT
	*/
	qrcodePaymentCurrencyForm.addParagraph(texts.currency, "heading_payment");
	qrcodePaymentCurrencyForm.addParagraph(qrcodeData.currency, "amount_payment");
	qrcodePaymentAmountForm.addParagraph(texts.amount, "heading_payment");
	if (this.ID_QRBILL_WITHOUT_AMOUNT) {
		qrcodePaymentAmountForm.addImage(this.corner_marks_payment_amount_svg, "corner_marks_payment_amount");
	} else {
		qrcodePaymentAmountForm.addParagraph(qrcodeData.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "),"amount_payment"); //thousands separator blank
	}


	/**
	*	PAYMENT TEXT
	*/
	qrcodePaymentTextForm.addParagraph(texts.payableTo, "heading_payment paddingTop");

	if (qrcodeData.supplierIbanNumber.indexOf("@error") > -1) {
		qrcodePaymentTextForm.addParagraph(qrcodeData.supplierIbanNumber, "value_payment error lineSpacing11");
	} else {
		qrcodePaymentTextForm.addParagraph(qrcodeData.supplierIbanNumber, "value_payment lineSpacing11");
	}

	if (qrcodeData.creditorName.indexOf("@error") > -1) {
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorName, "value_payment error lineSpacing11");
	} else {
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorName, "value_payment lineSpacing11");
	}
	
	if (qrcodeData.creditorAddress1.indexOf("@error") > -1) {
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorAddress1, "value_payment error lineSpacing11");
	} else {
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorAddress1, "value_payment lineSpacing11");
	}

	// if (qrcodeData.creditorAddress2.indexOf("@error") > -1) {
	// 	qrcodePaymentTextForm.addParagraph(qrcodeData.creditorAddress2, "value_payment error lineSpacing11");
	// } else {
	// 	qrcodePaymentTextForm.addParagraph(qrcodeData.creditorAddress2, "value_payment lineSpacing11");
	// }

	if (qrcodeData.creditorPostalcode.indexOf("@error") < 0 && qrcodeData.creditorCity.indexOf("@error") < 0) {
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorPostalcode + " " + qrcodeData.creditorCity, "value_payment lineSpacing11");
	} else if (qrcodeData.creditorPostalcode.indexOf("@error") < 0 && qrcodeData.creditorCity.indexOf("@error") > -1) {
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorPostalcode, "value_payment lineSpacing11");
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorCity, "value_payment error lineSpacing11");
	} else if (qrcodeData.creditorPostalcode.indexOf("@error") > -1 && qrcodeData.creditorCity.indexOf("@error") < 0) {
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorPostalcode, "value_payment error lineSpacing11");
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorCity, "value_payment lineSpacing11");
	} else if (qrcodeData.creditorPostalcode.indexOf("@error") > -1 && qrcodeData.creditorCity.indexOf("@error") > -1) {
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorPostalcode, "value_payment error lineSpacing11");
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorCity, "value_payment error lineSpacing11");
	}

	if (qrcodeData.creditorCountry.indexOf("@error") > -1) {
		qrcodePaymentTextForm.addParagraph(qrcodeData.creditorCountry, "value_payment error lineSpacing11");
	}

	if (qrcodeData.reference) {
		qrcodePaymentTextForm.addParagraph(" ","lineSpacing11");
		qrcodePaymentTextForm.addParagraph(texts.referenceNumber,"heading_payment lineSpacing11");
		if (qrcodeData.reference.indexOf("@error") > -1) { //prints the reference in red
			qrcodePaymentTextForm.addParagraph(qrcodeData.reference,"value_payment error lineSpacing11");
		} else {
			qrcodePaymentTextForm.addParagraph(qrcodeData.reference,"value_payment lineSpacing11");
		}
	}
	
	if (qrcodeData.additionalInformation || qrcodeData.billingInformation) {
		qrcodePaymentTextForm.addParagraph(" ","lineSpacing11");
		qrcodePaymentTextForm.addParagraph(texts.additionalInformation,"heading_payment lineSpacing11");
		if (qrcodeData.additionalInformation) {
			var textInfo = qrcodeData.additionalInformation.split("\n");
			for (var i = 0; i < textInfo.length; i++) {
				qrcodePaymentTextForm.addParagraph(textInfo[i],"value_payment lineSpacing11");
			}
		}
		if (qrcodeData.billingInformation) {
			qrcodePaymentTextForm.addParagraph(qrcodeData.billingInformation,"value_payment lineSpacing11");
		}
	}


	if (this.ID_QRBILL_WITHOUT_DEBTOR) {
		qrcodePaymentTextForm.addParagraph(" ","lineSpacing11");
		qrcodePaymentTextForm.addParagraph(texts.payableByBlank,"heading_payment lineSpacing11");
		qrcodePaymentTextForm.addImage(this.corner_marks_payment_payable_by_svg, "corner_marks_payment_payable_by");
	}
	else {
		qrcodePaymentTextForm.addParagraph(" ","lineSpacing11");
		qrcodePaymentTextForm.addParagraph(texts.payableBy,"heading_payment lineSpacing11");
		
		if (qrcodeData.debtorName.indexOf("@error") > -1) {
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorName, "value_payment error lineSpacing11");
		} else {
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorName, "value_payment lineSpacing11");
		}
		
		if (qrcodeData.debtorAddress1.indexOf("@error") > -1) {
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorAddress1, "value_payment error lineSpacing11");
		} else {
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorAddress1, "value_payment lineSpacing11");
		}

		// if (qrcodeData.debtorAddress2.indexOf("@error") > -1) {
		// 	qrcodePaymentTextForm.addParagraph(qrcodeData.debtorAddress2, "value_payment error lineSpacing11");
		// } else {
		// 	qrcodePaymentTextForm.addParagraph(qrcodeData.debtorAddress2, "value_payment lineSpacing11");
		// }

		if (qrcodeData.debtorPostalcode.indexOf("@error") < 0 && qrcodeData.debtorCity.indexOf("@error") < 0) {
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorPostalcode + " " + qrcodeData.debtorCity, "value_payment lineSpacing11");
		} else if (qrcodeData.debtorPostalcode.indexOf("@error") < 0 && qrcodeData.debtorCity.indexOf("@error") > -1) {
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorPostalcode, "value_payment lineSpacing11");
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorCity, "value_payment error lineSpacing11");
		} else if (qrcodeData.debtorPostalcode.indexOf("@error") > -1 && qrcodeData.debtorCity.indexOf("@error") < 0) {
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorPostalcode, "value_payment error lineSpacing11");
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorCity, "value_payment lineSpacing11");
		} else if (qrcodeData.debtorPostalcode.indexOf("@error") > -1 && qrcodeData.debtorCity.indexOf("@error") > -1) {
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorPostalcode, "value_payment error lineSpacing11");
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorCity, "value_payment error lineSpacing11");
		}

		if (qrcodeData.debtorCountry.indexOf("@error") > -1) {
			qrcodePaymentTextForm.addParagraph(qrcodeData.debtorCountry, "value_payment error lineSpacing11");
		}
	}
	

	/**
	*	PAYMENT FURTHER INFO
	*/
	if (qrcodeData.amount !== "0.00" && qrcodeData.furtherInformation1) {
		var p1 = qrcodePaymentFurtherInfoForm.addParagraph();
		p1.addText(texts.nameAV1 + ": ", "further_info_payment bold lineSpacing8");
		p1.addText(qrcodeData.furtherInformation1, "further_info_payment lineSpacing8");
	}
	if (qrcodeData.amount !== "0.00" && qrcodeData.furtherInformation2) {
		var p2 = qrcodePaymentFurtherInfoForm.addParagraph();
		p2.addText(texts.nameAV2 + ": ", "further_info_payment bold lineSpacing8");
		p2.addText(qrcodeData.furtherInformation2, "further_info_payment lineSpacing8");
	}
}


QRBill.prototype.printQRCode = function (invoiceObj, repDocObj, repStyleObj, userParam)
{
	if (!invoiceObj || !repDocObj) {
		return;
	}

	var langDoc = '';
	if (invoiceObj.customer_info.lang) {
		langDoc = invoiceObj.customer_info.lang;
	}
	if (langDoc.length <= 0) {
		langDoc = invoiceObj.document_info.locale;
	}
	
	// QR Code only for CHF and EUR
	if (invoiceObj.document_info.currency === "CHF" || invoiceObj.document_info.currency === "EUR" ||
		invoiceObj.document_info.currency === "chf" || invoiceObj.document_info.currency === "eur")
	{
		// 1. Get the QR Code texts for different languages
		var texts = this.getQrCodeTexts(langDoc);

		// 2. Define the QR-Bill type, based on user settings choices
		this.defineQrBillType(invoiceObj, userParam);

		// 3. Get the QR Code data that will be used to create the image and the receipt/payment slip
		var qrcodeData = this.getQrCodeData(invoiceObj, userParam, texts, langDoc);

		// 4. Create the QR Code image
		var qrcodeText = this.createTextQrImage(qrcodeData, texts);
		var qrCodeSvgImage = this.createQrImage(qrcodeText, texts, langDoc);

		// 5. Create the QR Code form report
		if (qrCodeSvgImage) {
			this.createQrForm(repDocObj, qrcodeData, qrCodeSvgImage, userParam, texts);
		}

		// 6. Apply QR Code styles to the report
		this.applyQRCodeStyle(repDocObj, repStyleObj, userParam);
	}
	else 
	{
		var msg = this.getErrorMessage(this.ID_ERR_CURRENCY, langDoc);
		if (this.banDoc) {
			this.banDoc.addMessage(msg, this.ID_ERR_CURRENCY);
		} else {
			throw new Error(msg + " (" + this.ID_ERR_QRCODE + ")");
		}

		return;
	}
}







QRBill.prototype.qrAdditionalInformation = function(invoiceObj, column)
{
	var textNotes = "";
	if (this.banDoc) {
		var invoiceNumber = invoiceObj.document_info.number;
		var transTable = this.banDoc.table("Transactions");
        if (transTable) {
            for (var i = 0; i < transTable.rowCount; i++) {
                var tRow = transTable.row(i);
                var docInvoice = tRow.value("DocInvoice");
                if (invoiceNumber === docInvoice) {
                    var info = tRow.value(column);
                    if (info) {
                        textNotes += info + " ";
                    }
                }
            }
        }
	}
	return textNotes;
}

QRBill.prototype.qrBillingInformation = function(invoiceObj)
{
	var structuredMessage = "";
	structuredMessage += "//S1";

	//Invoice number
	structuredMessage += "/10/"+invoiceObj.document_info.number.replace(/[^0-9a-zA-Z]+/g, "");
	
	//Invoice date
	var d = invoiceObj.document_info.date.substring(0,10).toString().split("-");
	var yy = d[0].substring(2, 4);
	var mm = d[1];
	var dd = d[2];
	structuredMessage += "/11/"+yy+mm+dd;

	//Customer reference
	var custRef = invoiceObj.customer_info.number;
	structuredMessage += "/20/" + custRef;

	//VAT number CHE-123.456.790 => 123456789
	var vatNumber = "";
	if (invoiceObj.supplier_info.vat_number) {
		vatNumber = invoiceObj.supplier_info.vat_number;	
		vatNumber = vatNumber.replace(/\D+/g,''); //replace all non-number characters	
		structuredMessage += "/30/" + vatNumber;
	}

	//VAT date
	var vatDate = yy+mm+dd;
	structuredMessage += "/31/" + vatDate;

	//VAT details
	// => *1 to remove zeros (8.00=>8; 3.70=>3.7)
	if (invoiceObj.billing_info.total_vat_rates.length > 0) {
		structuredMessage += "/32/";
		for (var i = 0; i < invoiceObj.billing_info.total_vat_rates.length; i++) {
			if (invoiceObj.billing_info.total_vat_rates[i+1]) {
				structuredMessage += invoiceObj.billing_info.total_vat_rates[i].vat_rate*1 +":"+ invoiceObj.billing_info.total_vat_rates[i].total_amount_vat_exclusive*1+";"; 
			}
			else {
				structuredMessage += invoiceObj.billing_info.total_vat_rates[i].vat_rate*1 +":"+ invoiceObj.billing_info.total_vat_rates[i].total_amount_vat_exclusive*1;
			}
		}
	}

	//VAT import tax (iva sulle importazioni)
	// => *1 to remove zeros (8.00=>8; 3.70=>3.7)
	// if (invoiceObj.billing_info.total_vat_rates.length > 0) {
	// 	structuredMessage += "/33/";
	// 	for (var i = 0; i < invoiceObj.billing_info.total_vat_rates.length; i++) {
	// 		if (invoiceObj.billing_info.total_vat_rates[i+1]) {
	// 			structuredMessage += invoiceObj.billing_info.total_vat_rates[i].vat_rate*1 +":"+ invoiceObj.billing_info.total_vat_rates[i].total_vat_amount*1+";"; 
	// 		}
	// 		else {
	// 			structuredMessage += invoiceObj.billing_info.total_vat_rates[i].vat_rate*1 +":"+ invoiceObj.billing_info.total_vat_rates[i].total_vat_amount*1;
	// 		}
	// 	}
	// }

	//Conditions
	var billingDate = invoiceObj.document_info.date;
	var termDate = "";
    
    // if (invoiceObj.billing_info.payment_term) {
    // 	// Cosa fare quando il temrine È inserito con il comando 10:ter
    // }
    if (invoiceObj.payment_info && invoiceObj.payment_info.due_date) {
    	termDate = invoiceObj.payment_info.due_date;
    }

    if (billingDate && termDate) {

    	//Differnce in days between two dates
		var date1 = new Date(billingDate);
		var date2 = new Date(termDate);
		var diffTime = Math.abs(date2 - date1);
		var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

	    var conditions = "0:" + diffDays;
	    structuredMessage += "/40/" + conditions;
	}


	
	return structuredMessage;
}







QRBill.prototype.qrCreditorReference = function(customerNumber, invoiceNumber)
{
	/*
		Creditor reference number creation.
		The reference part is free, so we can use the customer number and the invoice number (only numbers and characters).
		We create a string with these information and use it to generate the creditor reference number.
	*/

	var referenceString = customerNumber + invoiceNumber;
	var creditorReference = this.generateRfReference(referenceString);

	return creditorReference;
}

QRBill.prototype.convertRfNumbers = function(string) {

	/*
		Check and convert the customer and invoice numbers to the format:
		- Max 7 characters allowed for account/invoice numbers.
		- First character is the length of the account/invoice number (min 1, max 7).
		- Following characters is the account/invoice number.
		- All non ASCII numbers/letters are removed.
		- In case the account/invoice numbers doesn't exist we user "0" as value.
	*/
	var str = string.replace(/[^0-9a-zA-Z]/gi, ''); //remove all non-alphanumeric characters
	var strFinal = "";

	if (str.length < 1) { //string doesn't exists, we use '0'
		strFinal = "0";
	}	
	else if (str.length >= 1 && str.length <= 7) { //string is OK
		strFinal = str.length+str;
	}
	else if (str.length > 7) { //@error, string too long
		strFinal = "@error";
	}

	return strFinal;
}

QRBill.prototype.replaceRfChars = function(string)
{
	/* 
		Replace chars of the creditor reference with numbers
	*/
	string = string.replace(/A/g, 10);
	string = string.replace(/B/g, 11);
	string = string.replace(/C/g, 12);
	string = string.replace(/D/g, 13);
	string = string.replace(/E/g, 14);
	string = string.replace(/F/g, 15);
	string = string.replace(/G/g, 16);
	string = string.replace(/H/g, 17);
	string = string.replace(/I/g, 18);
	string = string.replace(/J/g, 19);
	string = string.replace(/K/g, 20);
	string = string.replace(/L/g, 21);
	string = string.replace(/M/g, 22);
	string = string.replace(/N/g, 23);
	string = string.replace(/O/g, 24);
	string = string.replace(/P/g, 25);
	string = string.replace(/Q/g, 26);
	string = string.replace(/R/g, 27);
	string = string.replace(/S/g, 28);
	string = string.replace(/T/g, 29);
	string = string.replace(/U/g, 30);
	string = string.replace(/V/g, 31);
	string = string.replace(/W/g, 32);
	string = string.replace(/X/g, 33);
	string = string.replace(/Y/g, 34);
	string = string.replace(/Z/g, 35);
	return string;
}

QRBill.prototype.calculateRfModulo97 = function(divident)
{
	var divisor = 97;
	var cDivident = '';
	var cRest = '';
	for (var i in divident) {
		var cChar = divident[i];
		var cOperator = cRest + '' + cDivident + '' + cChar;
		if (cOperator < parseInt(divisor)) {
			cDivident += '' + cChar;
		} else {
			cRest = cOperator % divisor;
			if (cRest == 0) {
				cRest = '';
			}
			cDivident = '';
		}
	}
	cRest += '' + cDivident;
	if (cRest == '') {
		cRest = 0;
	}
	return cRest;
}

QRBill.prototype.calculateRfCheckdigits = function(ref)
{
	var preResult = ref+"RF00"; // add 'RF00' to the end of ref
	preResult = this.replaceRfChars(preResult); // Replace to numeric
	var checkdigits = (98 - this.calculateRfModulo97(preResult)); // Calculate checkdigits
	if (checkdigits > 0 && checkdigits <= 9) { //set 2 digits if under 10
		checkdigits = "0"+checkdigits;
	}
	else if (checkdigits == 0) {
		checkdigits = "00"+checkdigits;
	}
	return checkdigits;
}

QRBill.prototype.validateRfReference = function(ref)
{
	var pre = ref.replace(/ /g,"").toUpperCase(); // Remove whitespace, uppercase
	ref = pre.substring(4) + pre.substring(0,4); // Move first 4 chars to the end of ref

	//Banana.console.log("validate step 1 (move first 4 chars to end): " + ref);

	var num = this.replaceRfChars(ref); // Replace to numeric

	//Banana.console.log("validate step 2 (replace chars to numeric): " + num);

	var mod = this.calculateRfModulo97(num);
	//Banana.console.log("validate step 3 (modulo97 of step2 string must be 1): " + mod);

	// Valid if up to 25 characters long and remainder is 1
	if (pre.length <= 25 && mod == 1) {
		return true;
	} else {
		return false;
	}
}

QRBill.prototype.generateRfReference = function(input)
{
	/*
		Creditor Reference is printed in blocks of 4 characters, last block can be less than 4 characters.

		Example: "RF48 1234 5678 9" => max 25 characters

		RF = identifier
		48 = check digits
		12345789 = reference
	*/

	var normalizedRef = input.replace(/ /g,"").toUpperCase(); // Remove whitespace, uppercase
	var checkdigits = this.calculateRfCheckdigits(normalizedRef); // Generate checkdigits
	var rfReference = "RF"+checkdigits+normalizedRef; // Join to required format
	
	//Banana.console.log("free reference string: " + input);
	//Banana.console.log("calc checkdigits: " + checkdigits);
	//Banana.console.log("calc rfReference: " + rfReference);
	
	if(this.validateRfReference(rfReference)) { // Check if validates
		//Banana.console.log("=> rfReference is valid: " + rfReference);
		rfReference = rfReference.replace(/[^a-zA-Z0-9]+/gi, '').replace(/(.{4})/g, '$1 '); //create blocks of 4
		return rfReference;
	}
	else {
		//Banana.console.log("=> rfReference not valid: " + rfReference);
		return false;
	}
}







QRBill.prototype.qrReferenceString = function(isrId, customerNo, invoiceNo)
{
  /**
   * The function qrReferenceString build the pvr reference,
   * containg the pvr identification, the customer and the invoice number.
   * @userParam isrId The pvr idetification number (given by the bank). Max 8 chars.
   * @userParam customerNo The customer number. Max 7 chars.
   * @userParam invoiceNo The invoice/oder number. Max 7 chars.
   */
   
   isrId = isrId.replace(/-/g,"");

  if (isrId.length > 8)
    return "@error isrId too long, max 8 chars. Your isrId " + isrId;
  else if (!isrId.match(/^[0-9]*$/))
    return "@error isrId invalid, only digits are permitted. Your isrId " + isrId ;
  else if (customerNo.length > 7)
    return "@error customerNo too long, max 7 digits. Your customerNo " + customerNo;
  else if (!customerNo.match(/^[0-9]*$/))
    return "@error customerNo invalid, only digits are permitted. Your customerNo " + customerNo;
  else if (invoiceNo.length > 7)
    return "@error invoiceNo too long, max 7 digits. Your invoiceNo " + invoiceNo;
  else if (!invoiceNo.match(/^[0-9]*$/))
    return "@error invoiceNo invalid, only digits are permitted. Your invoiceNo " + invoiceNo;

  var qrReference = isrId;
  while (qrReference.length + customerNo.length < 18)
    qrReference += "0";
  qrReference += customerNo;
  while (qrReference.length + invoiceNo.length < 25)
    qrReference += "0";
  qrReference += invoiceNo;
  qrReference += "0";
  qrReference += this.modulo10(qrReference);

  qrReference = qrReference.substr(0,2)+" "+
  qrReference.substr(2,5)+" "+qrReference.substr(7,5)+" "+qrReference.substr(12,5)+" "+qrReference.substr(17,5)+" "+qrReference.substr(22,5)+" "+qrReference.substr(27,5);

  return qrReference;
}

QRBill.prototype.modulo10 = function(string)
{
  /**
  * The function modulo10 calculate the modulo 10 of a string,
  * as described under the document "Postinance, Descrizione dei record,
  * Servizi elettronici".
  */

  // Description of algorithm on
  // Postinance, Descrizione dei record, Servizi elettronici
  var modulo10Table = [
    [0, 9, 4, 6, 8, 2, 7, 1, 3, 5, "0"],
    [9, 4, 6, 8, 2, 7, 1, 3, 5, 0, "9"],
    [4, 6, 8, 2, 7, 1, 3, 5, 0, 9, "8"],
    [6, 8, 2, 7, 1, 3, 5, 0, 9, 4, "7"],
    [8, 2, 7, 1, 3, 5, 0, 9, 4, 6, "6"],
    [2, 7, 1, 3, 5, 0, 9, 4, 6, 8, "5"],
    [7, 1, 3, 5, 0, 9, 4, 6, 8, 2, "4"],
    [1, 3, 5, 0, 9, 4, 6, 8, 2, 7, "3"],
    [3, 5, 0, 9, 4, 6, 8, 2, 7, 1, "2"],
    [5, 0, 9, 4, 6, 8, 2, 7, 1, 3, "1"],
  ];

  var module10Report = 0;

  if (string) {
    for (var i = 0; i < string.length; i++) {
       switch (string[i]) {
       case "0":
          module10Report = modulo10Table[module10Report][0];
          break;
       case "1":
          module10Report = modulo10Table[module10Report][1];
          break;
       case "2":
          module10Report = modulo10Table[module10Report][2];
          break;
       case "3":
          module10Report = modulo10Table[module10Report][3];
          break;
       case "4":
          module10Report = modulo10Table[module10Report][4];
          break;
       case "5":
          module10Report = modulo10Table[module10Report][5];
          break;
       case "6":
          module10Report = modulo10Table[module10Report][6];
          break;
       case "7":
          module10Report = modulo10Table[module10Report][7];
          break;
       case "8":
          module10Report = modulo10Table[module10Report][8];
          break;
       case "9":
          module10Report = modulo10Table[module10Report][9];
          break;
       }
    }
  }

  return modulo10Table[module10Report][10];
}








QRBill.prototype.formatIban = function(string)
{
	var formattedString = "";
	formattedString = string.replace(/ /g, "");
	formattedString = formattedString.substr(0,4) + " " + 
	formattedString.substr(4,4) + " " + 
	formattedString.substr(8,4) + " " + 
	formattedString.substr(12,4)+ " " +
	formattedString.substr(16,4)+ " " +
	formattedString.substr(20,1);
	return formattedString;
}







QRBill.prototype.applyQRCodeStyle = function(repDocObj, repStyleObj, userParam)
{
	// if (!repStyleObj) {
	// 	repStyleObj = repDocObj.newStyleSheet();
	// }

	if (repStyleObj) 
	{
		/*********************
			GENERAL
		*********************/
		var fontFamily = "Arial"; // only permitted: Arial, Helvetica, Frutiger, Liberation Sans
		var fontSizeReceipt = "9pt";
		var fontSizePayment = "11pt";

		//Overwrite default page margin of 20mm
		var style = repStyleObj.addStyle("@page");
		style.setAttribute("margin", "0mm");
   		
   		//QR text position
   		style.setAttribute("transform", "matrix(1.0, 0.0, 0.0, 1.0," + userParam.qr_code_position_dX + "," + userParam.qr_code_position_dY + ")");

		repStyleObj.addStyle(".alignRight","text-align:right");
		repStyleObj.addStyle(".paddingTop","padding-top:5mm");
		repStyleObj.addStyle(".paddingRight","padding-right:5mm");
		repStyleObj.addStyle(".paddingBottom","padding-bottom:5mm");
		repStyleObj.addStyle(".paddingLeft","padding-left:5mm");
		repStyleObj.addStyle(".error","color:red");
		repStyleObj.addStyle(".lineSpacing9", "margin-top:-0.45mm");
		repStyleObj.addStyle(".lineSpacing11", "margin-top:-0.35mm");
		repStyleObj.addStyle(".lineSpacing8", "margin-top:-0.3");

		var rectangleStyle = repStyleObj.addStyle(".rectangle");
		rectangleStyle.setAttribute("width","10px");
		rectangleStyle.setAttribute("height","100mm");
		rectangleStyle.setAttribute("background-color","white");

		var title = repStyleObj.addStyle(".title");
		title.setAttribute("font-size","11pt");
		title.setAttribute("font-weight","bold");



		/*********************
			RECEIPT
		*********************/
		var headingReceipt = repStyleObj.addStyle(".heading_receipt");
		headingReceipt.setAttribute("font-size","6pt");
		headingReceipt.setAttribute("font-weight","bold");

		var valueReceipt = repStyleObj.addStyle(".value_receipt");
		valueReceipt.setAttribute("font-size","8pt");

		var amountReceipt = repStyleObj.addStyle(".amount_receipt");
		amountReceipt.setAttribute("font-size","8pt");

		var acceptancePoint = repStyleObj.addStyle(".acceptance_point");
		acceptancePoint.setAttribute("font-size","6pt");
		acceptancePoint.setAttribute("font-weight","bold");

		/* Receipt form */
		style = repStyleObj.addStyle(".qrcode_receipt_Form");
		style.setAttribute("position", "absolute");
		style.setAttribute("left", "5mm");
		style.setAttribute("top", "192mm");
		style.setAttribute("color", "black");
		style.setAttribute("font-family", fontFamily);
		style.setAttribute("font-size", fontSizeReceipt);
		style.setAttribute("width","57mm"); //62mm-5mm
		style.setAttribute("height","105mm");
		if (userParam.qr_code_add_border_separator) {
			style.setAttribute("border-top","thin dashed black");
			style.setAttribute("border-right","thin dashed black");
		}

		/* Currency receipt form */
		style = repStyleObj.addStyle(".qrcode_receipt_currency_Form");
		style.setAttribute("position", "absolute");
		style.setAttribute("left", "5mm");
		style.setAttribute("top", "260mm");
		style.setAttribute("color", "black");
		style.setAttribute("font-family", fontFamily);
		style.setAttribute("font-size", fontSizeReceipt);
		style.setAttribute("width","20mm");
		style.setAttribute("height","14mm");
		//style.setAttribute("border","thin solid red");

		/* Amount receipt form */
		style = repStyleObj.addStyle(".qrcode_receipt_amount_Form");
		style.setAttribute("position", "absolute");
		style.setAttribute("left", "18mm");
		style.setAttribute("top", "260mm");
		style.setAttribute("color", "black");
		style.setAttribute("font-family", fontFamily);
		style.setAttribute("font-size", fontSizeReceipt);
		style.setAttribute("width","37mm");
		style.setAttribute("height","14mm");
		//style.setAttribute("border","thin solid red");

		/* Acceptance point receipt form */
		style = repStyleObj.addStyle(".qrcode_receipt_acceptancepoint_Form");
		style.setAttribute("position", "absolute");
		style.setAttribute("left", "0mm");
		style.setAttribute("top", "274mm");
		style.setAttribute("color", "black");
		style.setAttribute("font-family", fontFamily);
		style.setAttribute("font-size", fontSizeReceipt);
		style.setAttribute("width","62mm");
		style.setAttribute("height","18mm");



		/*********************
			PAYMENT
		*********************/
		var headingPayment = repStyleObj.addStyle(".heading_payment");
		headingPayment.setAttribute("font-size","8pt");
		headingPayment.setAttribute("font-weight","bold");

		var valuePayment = repStyleObj.addStyle(".value_payment");
		valuePayment.setAttribute("font-size","10pt");

		var amountPayment = repStyleObj.addStyle(".amount_payment");
		amountPayment.setAttribute("font-size","10pt");

		var furtherInfoPayment = repStyleObj.addStyle(".further_info_payment");
		furtherInfoPayment.setAttribute("font-size","7pt");

		/* Payment form */
		style = repStyleObj.addStyle(".qrcode_payment_Form");
		style.setAttribute("position", "absolute");
		style.setAttribute("left", "62mm");
		style.setAttribute("top", "192mm");
		style.setAttribute("color", "black");
		style.setAttribute("font-family", fontFamily);
		style.setAttribute("font-size", fontSizePayment);
		style.setAttribute("width","55mm");
		if (userParam.qr_code_add_border_separator) {
			style.setAttribute("border-top","thin dashed black");
		}
		//style.setAttribute("border","thin solid red");

		/* QRCode image form */
		style = repStyleObj.addStyle(".qrcode_payment_image_Form");
		style.setAttribute("position", "absolute");
		style.setAttribute("left", "66mm"); //67
		style.setAttribute("top", "208mm"); //209
		style.setAttribute("width","46mm");
		style.setAttribute("text-align", "center");
		//style.setAttribute("border","thin solid red");

		/* Currency form */
		style = repStyleObj.addStyle(".qrcode_payment_currency_Form");
		style.setAttribute("position", "absolute");
		style.setAttribute("left", "67mm");
		style.setAttribute("top", "260mm");
		style.setAttribute("color", "black");
		style.setAttribute("font-family", fontFamily);
		style.setAttribute("font-size", fontSizePayment);
		style.setAttribute("width","20mm");
		style.setAttribute("height","14mm");
		//style.setAttribute("border","thin solid red");

		/* Amount form */
		style = repStyleObj.addStyle(".qrcode_payment_amount_Form");
		style.setAttribute("position", "absolute");
		style.setAttribute("left", "82mm");
		style.setAttribute("top", "260mm");
		style.setAttribute("color", "black");
		style.setAttribute("font-family", fontFamily);
		style.setAttribute("font-size", fontSizePayment);
		style.setAttribute("width","31mm");
		style.setAttribute("height","14mm");
		//style.setAttribute("border","thin solid red");

		/* Texts details form */
		style = repStyleObj.addStyle(".qrcode_payment_text_Form");
		style.setAttribute("position", "absolute");
		style.setAttribute("left", "117mm");
		style.setAttribute("top", "192mm");
		style.setAttribute("color", "black");
		style.setAttribute("font-family", fontFamily);
		style.setAttribute("font-size", fontSizePayment);
		style.setAttribute("width","87mm");
		style.setAttribute("height","88mm");
		//style.setAttribute("border","thin solid red");
		if (userParam.qr_code_add_border_separator) {
			style.setAttribute("border-top","thin dashed black");
		}

		/* Further info form */
		style = repStyleObj.addStyle(".qrcode_payment_further_info_Form");
		style.setAttribute("position", "absolute");
		style.setAttribute("left", "67mm");
		style.setAttribute("top", "280mm");
		style.setAttribute("color", "black");
		style.setAttribute("font-family", fontFamily);
		style.setAttribute("font-size", fontSizePayment);
		style.setAttribute("width","137mm");
		style.setAttribute("height","10mm");
		//style.setAttribute("border","thin solid red");




		/*********************
			IMAGES
		*********************/

		/* Scissors symbol */
		var scissors = repStyleObj.addStyle(".scissors");
		scissors.setAttribute("position", "absolute");
		scissors.setAttribute("width","5mm");
		scissors.setAttribute("margin-left", "10mm");
		scissors.setAttribute("margin-top", "190.4mm");

		/* QR Code */
		var qrCodeImage = repStyleObj.addStyle(".qr_code_image");
		qrCodeImage.setAttribute("width", "46mm");

		/* Swiss cross */
		var qrCodeCross = repStyleObj.addStyle(".qrcode_cross");
		qrCodeCross.setAttribute("position", "absolute");
		qrCodeCross.setAttribute("margin-left", "19.5mm");
		qrCodeCross.setAttribute("margin-top", "19.5mm");
		qrCodeCross.setAttribute("width", "7mm");

		/* Corner marks */
		var rectangleReceiptAddress = repStyleObj.addStyle(".corner_marks_receipt_payable_by");
		rectangleReceiptAddress.setAttribute("padding-left", "0mm");
		rectangleReceiptAddress.setAttribute("padding-top", "1mm");

		var rectangleReceiptAmount = repStyleObj.addStyle(".corner_marks_receipt_amount");
		rectangleReceiptAmount.setAttribute("position", "absolute");
		rectangleReceiptAmount.setAttribute("left", "8.8mm");
		rectangleReceiptAmount.setAttribute("top", "0mm");
		rectangleReceiptAmount.setAttribute("padding-right", "5mm");

		var rectanglePaymentAddress = repStyleObj.addStyle(".corner_marks_payment_payable_by");
		rectanglePaymentAddress.setAttribute("padding-left", "0mm");
		rectanglePaymentAddress.setAttribute("padding-top", "1mm");
		
		var rectanglePaymentAmount = repStyleObj.addStyle(".corner_marks_payment_amount");
		rectanglePaymentAmount.setAttribute("position", "absolute");
		rectanglePaymentAmount.setAttribute("left", "-5mm");
		rectanglePaymentAmount.setAttribute("top", "4mm");
		rectanglePaymentAmount.setAttribute("padding-right", "5mm");
	}
}

