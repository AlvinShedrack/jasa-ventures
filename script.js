let ledgerRecords = JSON.parse(localStorage.getItem("jasa_ledger_records")) || [];
let salesRecords = JSON.parse(localStorage.getItem("jasa_sales_records")) || [];
let purchaseRecords = JSON.parse(localStorage.getItem("jasa_purchase_records")) || [];
let costSalesRecords = JSON.parse(localStorage.getItem("jasa_cost_sales_records")) || [];
let advanceRecords = JSON.parse(localStorage.getItem("jasa_advance_records")) || [];

let deferredPrompt = null;

const onlineStatus = document.getElementById("onlineStatus");
const installBtn = document.getElementById("installBtn");

/*
  Replace this email with the email where Jasa Ventures backups should be sent.
*/
const BACKUP_EMAIL = "alvinshedrack90@gmail.com";

/*
  Your Formspree endpoint.
*/
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xjgzykol";

setDefaultDates();
attachFormulaListeners();
migrateOldRecords();
renderAll();

function setDefaultDates() {
  const today = new Date();

  [
    "ledgerDate",
    "salesDate",
    "purchaseDate",
    "costSalesDate",
    "advanceDate",
    "advanceRecoveryDate"
  ].forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.valueAsDate = today;
  });
}

function attachFormulaListeners() {
  ["purchaseQuantity", "purchasePrice"].forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.addEventListener("input", updatePurchaseAmount);
  });

  ["costSalesQuantity", "costSalesPrice"].forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.addEventListener("input", updateCostSalesAmount);
  });

  ["advanceEstimatedKg", "advanceNetWeight", "advancePrice"].forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.addEventListener("input", updateAdvanceCalculations);
  });
}

function updatePurchaseAmount() {
  const quantity = Number(document.getElementById("purchaseQuantity").value || 0);
  const price = Number(document.getElementById("purchasePrice").value || 0);
  document.getElementById("purchaseAmount").value = quantity * price || "";
}

function updateCostSalesAmount() {
  const quantity = Number(document.getElementById("costSalesQuantity").value || 0);
  const price = Number(document.getElementById("costSalesPrice").value || 0);
  document.getElementById("costSalesAmount").value = quantity * price || "";
}

function updateAdvanceCalculations() {
  const estimatedKg = Number(document.getElementById("advanceEstimatedKg")?.value || 0);
  const netWeight = Number(document.getElementById("advanceNetWeight")?.value || 0);
  const price = Number(document.getElementById("advancePrice")?.value || 0);

  const amount = netWeight * price;
  const excessDelivery = netWeight - estimatedKg;

  const amountField = document.getElementById("advanceAmount");
  const excessField = document.getElementById("advanceExcessDelivery");

  if (amountField) amountField.value = amount || "";
  if (excessField) excessField.value = excessDelivery || 0;
}

function openPage(pageId, buttonElement) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active-page");
  });

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.remove("active");
  });

  document.getElementById(pageId).classList.add("active-page");

  if (buttonElement) {
    buttonElement.classList.add("active");
  }
}

function migrateOldRecords() {
  purchaseRecords = purchaseRecords.map((record) => ({
    ...record,
    type: record.type || "Other",
    quantity: Number(record.quantity || 1),
    price: Number(record.price || record.amount || 0),
    amount: Number(record.amount || (Number(record.quantity || 1) * Number(record.price || 0)))
  }));

  costSalesRecords = costSalesRecords.map((record) => ({
    ...record,
    quantity: Number(record.quantity || 1),
    price: Number(record.price || record.amount || 0),
    amount: Number(record.amount || (Number(record.quantity || 1) * Number(record.price || 0)))
  }));

  advanceRecords = advanceRecords.map((record) => ({
    ...record,
    amount: Number(record.amount || (Number(record.netWeight || 0) * Number(record.price || 0))),
    excessDelivery: Number(record.excessDelivery || (Number(record.netWeight || 0) - Number(record.estimatedKg || 0)))
  }));

  saveAll();
}

/* =========================
   LEDGER
========================= */

document.getElementById("ledgerForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const date = document.getElementById("ledgerDate").value;
  const description = document.getElementById("ledgerDescription").value.trim();
  const type = document.getElementById("ledgerType").value;
  const amount = Number(document.getElementById("ledgerAmount").value);

  if (!date || !description || !type || amount <= 0) {
    alert("Please enter valid ledger details.");
    return;
  }

  ledgerRecords.push({
    id: createId(),
    date,
    description,
    type,
    amount
  });

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("ledgerDate").valueAsDate = new Date();
});

function renderLedger() {
  const table = document.getElementById("ledgerTable");
  const count = document.getElementById("ledgerCount");

  table.innerHTML = "";
  count.textContent = `${ledgerRecords.length} record${ledgerRecords.length === 1 ? "" : "s"}`;

  if (ledgerRecords.length === 0) {
    table.innerHTML = `<tr><td colspan="7" class="empty-row">No ledger records yet.</td></tr>`;
    return;
  }

  let balance = 0;

  ledgerRecords.forEach((record, index) => {
    if (record.type === "credit") {
      balance += Number(record.amount);
    } else {
      balance -= Number(record.amount);
    }

    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(record.date)}</td>
        <td>${escapeHTML(record.description)}</td>
        <td class="credit">${record.type === "credit" ? formatMoney(record.amount) : "-"}</td>
        <td class="debit">${record.type === "debit" ? formatMoney(record.amount) : "-"}</td>
        <td>${formatMoney(balance)}</td>
        <td><button class="delete-btn" onclick="deleteLedger('${record.id}')">Delete</button></td>
      </tr>
    `;
  });
}

function deleteLedger(id) {
  if (!confirm("Delete this ledger record?")) return;

  ledgerRecords = ledgerRecords.filter((record) => String(record.id) !== String(id));
  saveAll();
  renderAll();
}

/* =========================
   SALES
========================= */

document.getElementById("salesForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const date = document.getElementById("salesDate").value;
  const description = document.getElementById("salesDescription").value.trim();
  const invoice = document.getElementById("salesInvoice").value.trim();
  const amount = Number(document.getElementById("salesAmount").value);

  if (!date || !description || amount <= 0) {
    alert("Please enter valid sales details.");
    return;
  }

  salesRecords.push({
    id: createId(),
    date,
    description,
    invoice,
    amount
  });

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("salesDate").valueAsDate = new Date();
});

function renderSales() {
  const table = document.getElementById("salesTable");
  const count = document.getElementById("salesCount");

  table.innerHTML = "";
  count.textContent = `${salesRecords.length} record${salesRecords.length === 1 ? "" : "s"}`;

  if (salesRecords.length === 0) {
    table.innerHTML = `<tr><td colspan="7" class="empty-row">No sales records yet.</td></tr>`;
    return;
  }

  salesRecords.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(record.date)}</td>
        <td>${escapeHTML(record.description)}</td>
        <td>${escapeHTML(record.invoice || "-")}</td>
        <td class="credit">${formatMoney(record.amount)}</td>
        <td>${getMonthName(record.date)}</td>
        <td><button class="delete-btn" onclick="deleteSale('${record.id}')">Delete</button></td>
      </tr>
    `;
  });
}

function deleteSale(id) {
  if (!confirm("Delete this sales record?")) return;

  salesRecords = salesRecords.filter((record) => String(record.id) !== String(id));
  saveAll();
  renderAll();
}

/* =========================
   PURCHASES
========================= */

document.getElementById("purchaseForm").addEventListener("submit", function (event) {
  event.preventDefault();

  updatePurchaseAmount();

  const date = document.getElementById("purchaseDate").value;
  const type = document.getElementById("purchaseType").value;
  const description = document.getElementById("purchaseDescription").value.trim();
  const receipt = document.getElementById("purchaseReceipt").value.trim();
  const quantity = Number(document.getElementById("purchaseQuantity").value);
  const price = Number(document.getElementById("purchasePrice").value);
  const amount = quantity * price;

  if (!date || !type || !description || quantity <= 0 || price <= 0 || amount <= 0) {
    alert("Please enter valid purchase details.");
    return;
  }

  purchaseRecords.push({
    id: createId(),
    date,
    type,
    description,
    receipt,
    quantity,
    price,
    amount
  });

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("purchaseDate").valueAsDate = new Date();
  document.getElementById("purchaseAmount").value = "";
});

function renderPurchases() {
  const table = document.getElementById("purchaseTable");
  const count = document.getElementById("purchaseCount");

  table.innerHTML = "";
  count.textContent = `${purchaseRecords.length} record${purchaseRecords.length === 1 ? "" : "s"}`;

  if (purchaseRecords.length === 0) {
    table.innerHTML = `<tr><td colspan="10" class="empty-row">No purchase records yet.</td></tr>`;
    return;
  }

  purchaseRecords.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(record.date)}</td>
        <td>${escapeHTML(record.type || "Other")}</td>
        <td>${escapeHTML(record.description)}</td>
        <td>${escapeHTML(record.receipt || "-")}</td>
        <td>${formatNumber(record.quantity)}</td>
        <td>${formatMoney(record.price)}</td>
        <td class="debit">${formatMoney(record.amount)}</td>
        <td>${getMonthName(record.date)}</td>
        <td><button class="delete-btn" onclick="deletePurchase('${record.id}')">Delete</button></td>
      </tr>
    `;
  });
}

function deletePurchase(id) {
  if (!confirm("Delete this purchase record?")) return;

  purchaseRecords = purchaseRecords.filter((record) => String(record.id) !== String(id));
  saveAll();
  renderAll();
}

/* =========================
   COST OF SALES
========================= */

document.getElementById("costSalesForm").addEventListener("submit", function (event) {
  event.preventDefault();

  updateCostSalesAmount();

  const date = document.getElementById("costSalesDate").value;
  const description = document.getElementById("costSalesDescription").value.trim();
  const reference = document.getElementById("costSalesReference").value.trim();
  const quantity = Number(document.getElementById("costSalesQuantity").value);
  const price = Number(document.getElementById("costSalesPrice").value);
  const amount = quantity * price;

  if (!date || !description || quantity <= 0 || price <= 0 || amount <= 0) {
    alert("Please enter valid cost of sales details.");
    return;
  }

  costSalesRecords.push({
    id: createId(),
    date,
    description,
    reference,
    quantity,
    price,
    amount
  });

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("costSalesDate").valueAsDate = new Date();
  document.getElementById("costSalesAmount").value = "";
});

function renderCostSales() {
  const table = document.getElementById("costSalesTable");
  const count = document.getElementById("costSalesCount");

  table.innerHTML = "";
  count.textContent = `${costSalesRecords.length} record${costSalesRecords.length === 1 ? "" : "s"}`;

  if (costSalesRecords.length === 0) {
    table.innerHTML = `<tr><td colspan="9" class="empty-row">No cost of sales records yet.</td></tr>`;
    return;
  }

  costSalesRecords.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(record.date)}</td>
        <td>${escapeHTML(record.description)}</td>
        <td>${escapeHTML(record.reference || "-")}</td>
        <td>${formatNumber(record.quantity)}</td>
        <td>${formatMoney(record.price)}</td>
        <td class="debit">${formatMoney(record.amount)}</td>
        <td>${getMonthName(record.date)}</td>
        <td><button class="delete-btn" onclick="deleteCostSale('${record.id}')">Delete</button></td>
      </tr>
    `;
  });
}

function deleteCostSale(id) {
  if (!confirm("Delete this cost of sales record?")) return;

  costSalesRecords = costSalesRecords.filter((record) => String(record.id) !== String(id));
  saveAll();
  renderAll();
}

/* =========================
   ADVANCE
========================= */

document.getElementById("advanceForm").addEventListener("submit", function (event) {
  event.preventDefault();

  updateAdvanceCalculations();

  const advanceDate = document.getElementById("advanceDate").value;
  const person = document.getElementById("advancePerson").value.trim();
  const paymentMode = document.getElementById("advancePaymentMode").value;
  const estimatedPrice = Number(document.getElementById("advanceEstimatedPrice").value);
  const estimatedKg = Number(document.getElementById("advanceEstimatedKg").value);
  const recoveryDate = document.getElementById("advanceRecoveryDate").value;
  const recoveryType = document.getElementById("advanceRecoveryType").value;
  const grossWeight = Number(document.getElementById("advanceGrossWeight").value);
  const netWeight = Number(document.getElementById("advanceNetWeight").value);
  const price = Number(document.getElementById("advancePrice").value);
  const amount = netWeight * price;
  const excessDelivery = netWeight - estimatedKg;

  if (
    !advanceDate ||
    !person ||
    !paymentMode ||
    !recoveryDate ||
    !recoveryType ||
    estimatedPrice < 0 ||
    estimatedKg < 0 ||
    grossWeight < 0 ||
    netWeight < 0 ||
    price < 0
  ) {
    alert("Please enter valid advance details.");
    return;
  }

  advanceRecords.push({
    id: createId(),
    advanceDate,
    person,
    paymentMode,
    estimatedPrice,
    estimatedKg,
    recoveryDate,
    recoveryType,
    grossWeight,
    netWeight,
    price,
    amount,
    excessDelivery
  });

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("advanceDate").valueAsDate = new Date();
  document.getElementById("advanceRecoveryDate").valueAsDate = new Date();
  document.getElementById("advanceAmount").value = "";
  document.getElementById("advanceExcessDelivery").value = "";
});

function renderAdvance() {
  const table = document.getElementById("advanceTable");
  const count = document.getElementById("advanceCount");

  if (!table || !count) return;

  table.innerHTML = "";
  count.textContent = `${advanceRecords.length} record${advanceRecords.length === 1 ? "" : "s"}`;

  if (advanceRecords.length === 0) {
    table.innerHTML = `<tr><td colspan="14" class="empty-row">No advance records yet.</td></tr>`;
    return;
  }

  advanceRecords.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(record.advanceDate)}</td>
        <td>${escapeHTML(record.person)}</td>
        <td>${escapeHTML(record.paymentMode)}</td>
        <td>${formatMoney(record.estimatedPrice)}</td>
        <td>${formatNumber(record.estimatedKg)}</td>
        <td>${formatDate(record.recoveryDate)}</td>
        <td>${escapeHTML(record.recoveryType)}</td>
        <td>${formatNumber(record.grossWeight)}</td>
        <td>${formatNumber(record.netWeight)}</td>
        <td>${formatMoney(record.price)}</td>
        <td class="credit">${formatMoney(record.amount)}</td>
        <td class="${record.excessDelivery >= 0 ? "positive" : "negative"}">${formatNumber(record.excessDelivery)}</td>
        <td><button class="delete-btn" onclick="deleteAdvance('${record.id}')">Delete</button></td>
      </tr>
    `;
  });
}

function deleteAdvance(id) {
  if (!confirm("Delete this advance record?")) return;

  advanceRecords = advanceRecords.filter((record) => String(record.id) !== String(id));
  saveAll();
  renderAll();
}

/* =========================
   DASHBOARD AND MONTHLY
========================= */

function renderDashboard() {
  const totals = getTotals();

  document.getElementById("totalSales").textContent = formatMoney(totals.sales);
  document.getElementById("totalPurchases").textContent = formatMoney(totals.purchases);
  document.getElementById("totalCostSales").textContent = formatMoney(totals.costSales);
  document.getElementById("grossProfit").textContent = formatMoney(totals.grossProfit);
  document.getElementById("totalAdvances").textContent = formatMoney(totals.advances);
  document.getElementById("ledgerBalance").textContent = formatMoney(totals.balance);
  document.getElementById("totalCredit").textContent = formatMoney(totals.credit);
  document.getElementById("totalDebit").textContent = formatMoney(totals.debit);
  document.getElementById("totalRecords").textContent = totals.records;
}

function renderMonthlySummary() {
  const table = document.getElementById("monthlyTable");
  table.innerHTML = "";

  const monthMap = buildMonthMap();
  const months = Object.keys(monthMap).sort();

  if (months.length === 0) {
    table.innerHTML = `<tr><td colspan="5" class="empty-row">No monthly records yet.</td></tr>`;
    return;
  }

  months.forEach((month) => {
    const data = monthMap[month];
    const grossProfit = data.costSales + data.purchases - data.sales;

    table.innerHTML += `
      <tr>
        <td>${formatMonthKey(month)}</td>
        <td class="credit">${formatMoney(data.sales)}</td>
        <td class="debit">${formatMoney(data.purchases)}</td>
        <td class="debit">${formatMoney(data.costSales)}</td>
        <td class="${grossProfit >= 0 ? "positive" : "negative"}">${formatMoney(grossProfit)}</td>
      </tr>
    `;
  });
}

function buildMonthMap() {
  const monthMap = {};

  function addToMonth(records, key) {
    records.forEach((record) => {
      const month = getMonthKey(record.date || record.advanceDate);

      if (!monthMap[month]) {
        monthMap[month] = {
          sales: 0,
          purchases: 0,
          costSales: 0
        };
      }

      monthMap[month][key] += Number(record.amount);
    });
  }

  addToMonth(salesRecords, "sales");
  addToMonth(purchaseRecords, "purchases");
  addToMonth(costSalesRecords, "costSales");

  return monthMap;
}

/* =========================
   EXPORTS, EMAIL AND FORMSPREE
========================= */

function generateFullCSV() {
  let csv = "JASA VENTURES FULL BACKUP\n\n";

  csv += "LEDGER\n";
  csv += "Date,Description,Credit,Debit,Balance\n";

  let balance = 0;

  ledgerRecords.forEach((record) => {
    let credit = "";
    let debit = "";

    if (record.type === "credit") {
      credit = record.amount;
      balance += Number(record.amount);
    } else {
      debit = record.amount;
      balance -= Number(record.amount);
    }

    csv += `${formatDate(record.date)},"${cleanCSV(record.description)}",${credit},${debit},${balance}\n`;
  });

  csv += "\nSALES\n";
  csv += "Date,Description,Invoice,Amount,Month\n";

  salesRecords.forEach((record) => {
    csv += `${formatDate(record.date)},"${cleanCSV(record.description)}","${cleanCSV(record.invoice || "")}",${record.amount},"${getMonthName(record.date)}"\n`;
  });

  csv += "\nPURCHASES\n";
  csv += "Date,Type,Description,Receipt,Quantity,Price,Amount,Month\n";

  purchaseRecords.forEach((record) => {
    csv += `${formatDate(record.date)},"${cleanCSV(record.type || "Other")}","${cleanCSV(record.description)}","${cleanCSV(record.receipt || "")}",${record.quantity},${record.price},${record.amount},"${getMonthName(record.date)}"\n`;
  });

  csv += "\nCOST OF SALES\n";
  csv += "Date,Description,Reference,Quantity,Price,Amount,Month\n";

  costSalesRecords.forEach((record) => {
    csv += `${formatDate(record.date)},"${cleanCSV(record.description)}","${cleanCSV(record.reference || "")}",${record.quantity},${record.price},${record.amount},"${getMonthName(record.date)}"\n`;
  });

  csv += "\nADVANCE RECORDS\n";
  csv += "Advance Date,Person,Payment Mode,Estimated Price,Estimated Kg,Recovery Date,Recovery Type,Gross Weight,Net Weight,Price,Amount,Excess Delivery\n";

  advanceRecords.forEach((record) => {
    csv += `${formatDate(record.advanceDate)},"${cleanCSV(record.person)}","${cleanCSV(record.paymentMode)}",${record.estimatedPrice},${record.estimatedKg},${formatDate(record.recoveryDate)},"${cleanCSV(record.recoveryType)}",${record.grossWeight},${record.netWeight},${record.price},${record.amount},${record.excessDelivery}\n`;
  });

  csv += "\nMONTHLY SUMMARY\n";
  csv += "Month,Sales,Purchases,Cost of Sales,Gross Profit\n";

  const monthMap = buildMonthMap();

  Object.keys(monthMap).sort().forEach((month) => {
    const data = monthMap[month];
    const grossProfit = data.costSales + data.purchases - data.sales;
    csv += `${formatMonthKey(month)},${data.sales},${data.purchases},${data.costSales},${grossProfit}\n`;
  });

  return csv;
}

function downloadAllCSV() {
  if (!hasAnyRecord()) {
    alert("No records available for download.");
    return;
  }

  downloadFile(generateFullCSV(), "jasa_ventures_full_backup.csv", "text/csv");
}

function downloadStyledExcelBackup() {
  if (!hasAnyRecord()) {
    alert("No records available for download.");
    return;
  }

  const html = buildStyledBackupHTML("Downloaded Backup");
  downloadFile(html, "jasa_ventures_styled_backup.xls", "application/vnd.ms-excel");
}

function printStyledPDF() {
  if (!hasAnyRecord()) {
    alert("No records available to print.");
    return;
  }

  const staffName = prompt("Enter staff name for the PDF report:", "");
  const reportHTML = buildStyledBackupHTML(staffName || "Not Provided");

  const printWindow = window.open("", "_blank");
  printWindow.document.open();
  printWindow.document.write(reportHTML);
  printWindow.document.close();

  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
  };
}

async function sendBackupByEmailAndFormspree() {
  if (!hasAnyRecord()) {
    alert("No records available for sending.");
    return;
  }

  const staffName = prompt("Enter name of staff sending this backup:");

  if (!staffName || !staffName.trim()) {
    alert("Staff name is required.");
    return;
  }

  const recipientEmail = prompt("Enter recipient email:", BACKUP_EMAIL);

  if (!recipientEmail || !recipientEmail.includes("@")) {
    alert("Please enter a valid recipient email.");
    return;
  }

  const subject = `Jasa Ventures Backup - ${staffName.trim()} - ${formatDateForFile(new Date())}`;
  const tabledText = buildPlainTextBackup(staffName.trim());
  const htmlReport = buildStyledBackupHTML(staffName.trim());
  const csv = generateFullCSV();

  /*
    Because Formspree does not allow uploads on your plan:
    1. This sends tabled backup text to Formspree.
    2. This opens Gmail/mail app with subject and body ready.
    3. This downloads CSV, Excel and HTML report so the sender can attach them manually if needed.
  */

  downloadFile(csv, "jasa_ventures_backup.csv", "text/csv");
  downloadFile(htmlReport, "jasa_ventures_styled_excel_backup.xls", "application/vnd.ms-excel");
  downloadFile(htmlReport, "jasa_ventures_pdf_style_report.html", "text/html");

  await sendTabledTextToFormspree(staffName.trim(), recipientEmail, subject, tabledText, htmlReport, csv);

  openEmailApp(recipientEmail, subject, tabledText);

  alert("Backup text was sent to Formspree. Gmail/mail app has opened with the subject and body ready. The CSV, Excel and report files have also been downloaded for manual attachment.");
}

async function sendTabledTextToFormspree(staffName, recipientEmail, subject, tabledText, htmlReport, csv) {
  if (!navigator.onLine) {
    alert("You are offline. Email app will open, but Formspree cannot receive backup until you are online.");
    return;
  }

  const payload = {
    business_name: "Jasa Ventures",
    staff_name: staffName,
    recipient_email: recipientEmail,
    subject: subject,
    backup_date: new Date().toLocaleString(),
    tabled_text_backup: tabledText,
    html_table_backup: htmlReport,
    csv_text_backup: csv
  };

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      alert("Formspree backup failed, but the email app will still open.");
    }
  } catch (error) {
    console.error(error);
    alert("Formspree backup failed, but the email app will still open.");
  }
}

function openEmailApp(to, subject, body) {
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

function exportJSONBackup() {
  const backup = {
    app: "Jasa Ventures",
    version: "1.0",
    exported_at: new Date().toISOString(),
    ledgerRecords,
    salesRecords,
    purchaseRecords,
    costSalesRecords,
    advanceRecords
  };

  const json = JSON.stringify(backup, null, 2);
  downloadFile(json, "jasa_ventures_app_data_backup.json", "application/json");
}

function triggerImport() {
  const importFile = document.getElementById("importFile");

  if (!importFile) {
    alert("Import file input not found.");
    return;
  }

  importFile.value = "";
  importFile.click();
}

function importAndMergeData(event) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      if (!confirm("Import and merge this data with existing records?")) {
        return;
      }

      ledgerRecords = mergeRecords(ledgerRecords, data.ledgerRecords || []);
      salesRecords = mergeRecords(salesRecords, data.salesRecords || []);
      purchaseRecords = mergeRecords(purchaseRecords, data.purchaseRecords || []);
      costSalesRecords = mergeRecords(costSalesRecords, data.costSalesRecords || []);
      advanceRecords = mergeRecords(advanceRecords, data.advanceRecords || []);

      saveAll();
      renderAll();

      alert("Data imported and merged successfully.");
    } catch (error) {
      alert("Invalid backup file. Please upload a valid Jasa Ventures JSON backup.");
      console.error(error);
    }
  };

  reader.readAsText(file);
}

function mergeRecords(existingRecords, importedRecords) {
  const map = new Map();

  existingRecords.forEach((record) => {
    map.set(String(record.id), record);
  });

  importedRecords.forEach((record) => {
    const importedId = record.id || createId();

    if (!map.has(String(importedId))) {
      map.set(String(importedId), {
        ...record,
        id: importedId
      });
    }
  });

  return Array.from(map.values());
}

/* =========================
   STYLED REPORT BUILDER
========================= */

function buildStyledBackupHTML(staffName) {
  const totals = getTotals();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Jasa Ventures Backup Report</title>
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1f2937;
    margin: 24px;
    background: #ffffff;
  }

  .report-header {
    background: linear-gradient(135deg, #243865, #16223d);
    color: #ffffff;
    padding: 24px;
    border-radius: 14px;
    margin-bottom: 20px;
    border-bottom: 6px solid #e7ad4a;
  }

  .report-header h1 {
    margin: 0 0 8px;
    font-size: 28px;
    letter-spacing: 0.4px;
  }

  .meta {
    margin: 5px 0;
    font-size: 14px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .summary-box {
    border: 1px solid #d9dee8;
    background: #edf5ff;
    padding: 14px;
    border-radius: 12px;
    border-left: 5px solid #e7ad4a;
  }

  .summary-box strong {
    display: block;
    color: #243865;
    font-size: 13px;
    text-transform: uppercase;
  }

  .summary-box span {
    display: block;
    margin-top: 7px;
    font-size: 20px;
    font-weight: bold;
  }

  h2 {
    color: #243865;
    margin-top: 28px;
    border-left: 6px solid #e7ad4a;
    padding-left: 10px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 22px;
    font-size: 12px;
    border: 1px solid #d9dee8;
  }

  th {
    background: #243865;
    color: #ffffff;
    padding: 10px;
    border: 1px solid #16223d;
    text-align: center;
    font-weight: bold;
  }

  td {
    padding: 9px;
    border: 1px solid #d9dee8;
    text-align: center;
  }

  tr:nth-child(even) td {
    background: #f8fbff;
  }

  tr:nth-child(odd) td {
    background: #ffffff;
  }

  .credit,
  .positive {
    color: #0f8a3a;
    font-weight: bold;
  }

  .debit,
  .negative {
    color: #c62828;
    font-weight: bold;
  }

  .formula-note {
    background: #fff4e0;
    border: 1px solid #e7ad4a;
    color: #243865;
    padding: 13px;
    border-radius: 10px;
    margin-bottom: 18px;
    font-weight: bold;
  }

  @media print {
    body {
      margin: 10mm;
    }

    .report-header {
      border-radius: 0;
    }

    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    table {
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
  }
</style>
</head>
<body>
  <div class="report-header">
    <h1>Jasa Ventures Business Backup Report</h1>
    <p class="meta"><strong>Staff Name:</strong> ${escapeHTML(staffName)}</p>
    <p class="meta"><strong>Generated On:</strong> ${new Date().toLocaleString()}</p>
    <p class="meta"><strong>Date Format:</strong> DD/MM/YYYY</p>
  </div>

  <div class="summary-grid">
    <div class="summary-box"><strong>Total Sales</strong><span>${formatMoney(totals.sales)}</span></div>
    <div class="summary-box"><strong>Total Purchases</strong><span>${formatMoney(totals.purchases)}</span></div>
    <div class="summary-box"><strong>Total Cost of Sales</strong><span>${formatMoney(totals.costSales)}</span></div>
    <div class="summary-box"><strong>Gross Profit</strong><span>${formatMoney(totals.grossProfit)}</span></div>
    <div class="summary-box"><strong>Total Advances</strong><span>${formatMoney(totals.advances)}</span></div>
    <div class="summary-box"><strong>Ledger Credit</strong><span>${formatMoney(totals.credit)}</span></div>
    <div class="summary-box"><strong>Ledger Debit</strong><span>${formatMoney(totals.debit)}</span></div>
    <div class="summary-box"><strong>Ledger Balance</strong><span>${formatMoney(totals.balance)}</span></div>
    <div class="summary-box"><strong>Total Records</strong><span>${totals.records}</span></div>
  </div>

  <div class="formula-note">
    Gross Profit Formula Used: Cost of Sales + Purchases - Sales
  </div>

  ${buildHTMLSection("Ledger Records", ["#", "Date", "Description", "Credit", "Debit", "Balance"], getLedgerRows())}
  ${buildHTMLSection("Sales Records", ["#", "Date", "Description", "Invoice No.", "Amount", "Month"], getSalesRows())}
  ${buildHTMLSection("Purchase Records", ["#", "Date", "Type", "Description", "Receipt No.", "Quantity", "Price", "Amount", "Month"], getPurchaseRows())}
  ${buildHTMLSection("Cost of Sales Records", ["#", "Date", "Description", "Reference No.", "Quantity", "Price", "Amount", "Month"], getCostSalesRows())}
  ${buildHTMLSection("Advance Records", ["#", "Advance Date", "Person", "Payment Mode", "Estimated Price", "Estimated Kg", "Recovery Date", "Recovery Type", "Gross Weight", "Net Weight", "Price", "Amount", "Excess Delivery"], getAdvanceRows())}
  ${buildHTMLSection("Monthly Summary", ["Month", "Sales", "Purchases", "Cost of Sales", "Gross Profit"], getMonthlyRows())}
</body>
</html>`;
}

function buildHTMLSection(title, headers, rows) {
  if (!rows.length) {
    return `<h2>${title}</h2><p>No records available.</p>`;
  }

  return `
    <h2>${title}</h2>
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHTML(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            ${row.map((cell) => `<td>${cell}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function getLedgerRows() {
  let balance = 0;

  return ledgerRecords.map((record, index) => {
    if (record.type === "credit") {
      balance += Number(record.amount);
    } else {
      balance -= Number(record.amount);
    }

    return [
      index + 1,
      formatDate(record.date),
      escapeHTML(record.description),
      record.type === "credit" ? `<span class="credit">${formatMoney(record.amount)}</span>` : "-",
      record.type === "debit" ? `<span class="debit">${formatMoney(record.amount)}</span>` : "-",
      formatMoney(balance)
    ];
  });
}

function getSalesRows() {
  return salesRecords.map((record, index) => [
    index + 1,
    formatDate(record.date),
    escapeHTML(record.description),
    escapeHTML(record.invoice || "-"),
    `<span class="credit">${formatMoney(record.amount)}</span>`,
    getMonthName(record.date)
  ]);
}

function getPurchaseRows() {
  return purchaseRecords.map((record, index) => [
    index + 1,
    formatDate(record.date),
    escapeHTML(record.type || "Other"),
    escapeHTML(record.description),
    escapeHTML(record.receipt || "-"),
    formatNumber(record.quantity),
    formatMoney(record.price),
    `<span class="debit">${formatMoney(record.amount)}</span>`,
    getMonthName(record.date)
  ]);
}

function getCostSalesRows() {
  return costSalesRecords.map((record, index) => [
    index + 1,
    formatDate(record.date),
    escapeHTML(record.description),
    escapeHTML(record.reference || "-"),
    formatNumber(record.quantity),
    formatMoney(record.price),
    `<span class="debit">${formatMoney(record.amount)}</span>`,
    getMonthName(record.date)
  ]);
}

function getAdvanceRows() {
  return advanceRecords.map((record, index) => [
    index + 1,
    formatDate(record.advanceDate),
    escapeHTML(record.person),
    escapeHTML(record.paymentMode),
    formatMoney(record.estimatedPrice),
    formatNumber(record.estimatedKg),
    formatDate(record.recoveryDate),
    escapeHTML(record.recoveryType),
    formatNumber(record.grossWeight),
    formatNumber(record.netWeight),
    formatMoney(record.price),
    `<span class="credit">${formatMoney(record.amount)}</span>`,
    `<span class="${record.excessDelivery >= 0 ? "positive" : "negative"}">${formatNumber(record.excessDelivery)}</span>`
  ]);
}

function getMonthlyRows() {
  const monthMap = buildMonthMap();

  return Object.keys(monthMap).sort().map((month) => {
    const data = monthMap[month];
    const grossProfit = data.costSales + data.purchases - data.sales;

    return [
      formatMonthKey(month),
      `<span class="credit">${formatMoney(data.sales)}</span>`,
      `<span class="debit">${formatMoney(data.purchases)}</span>`,
      `<span class="debit">${formatMoney(data.costSales)}</span>`,
      `<span class="${grossProfit >= 0 ? "positive" : "negative"}">${formatMoney(grossProfit)}</span>`
    ];
  });
}

function buildPlainTextBackup(staffName) {
  const totals = getTotals();

  return `
JASA VENTURES BACKUP REPORT
Staff Name: ${staffName}
Generated On: ${new Date().toLocaleString()}
Date Format: DD/MM/YYYY

SUMMARY
Total Sales: ${formatMoney(totals.sales)}
Total Purchases: ${formatMoney(totals.purchases)}
Total Cost of Sales: ${formatMoney(totals.costSales)}
Gross Profit: ${formatMoney(totals.grossProfit)}
Total Advances: ${formatMoney(totals.advances)}
Ledger Credit: ${formatMoney(totals.credit)}
Ledger Debit: ${formatMoney(totals.debit)}
Ledger Balance: ${formatMoney(totals.balance)}
Total Records: ${totals.records}

Gross Profit Formula Used:
Cost of Sales + Purchases - Sales

${buildTextSection("LEDGER RECORDS", ["#", "Date", "Description", "Credit", "Debit", "Balance"], getLedgerTextRows())}

${buildTextSection("SALES RECORDS", ["#", "Date", "Description", "Invoice", "Amount", "Month"], getSalesTextRows())}

${buildTextSection("PURCHASE RECORDS", ["#", "Date", "Type", "Description", "Receipt", "Qty", "Price", "Amount", "Month"], getPurchaseTextRows())}

${buildTextSection("COST OF SALES RECORDS", ["#", "Date", "Description", "Reference", "Qty", "Price", "Amount", "Month"], getCostSalesTextRows())}

${buildTextSection("ADVANCE RECORDS", ["#", "Advance Date", "Person", "Mode", "Est Price", "Est Kg", "Recovery Date", "Recovery Type", "Gross", "Net", "Price", "Amount", "Excess"], getAdvanceTextRows())}

${buildTextSection("MONTHLY SUMMARY", ["Month", "Sales", "Purchases", "Cost of Sales", "Gross Profit"], getMonthlyTextRows())}

NOTE:
CSV, Styled Excel and PDF-style report files have been downloaded from the app.
Attach them manually if Gmail asks for attachments.
`;
}

function buildTextSection(title, headers, rows) {
  if (!rows.length) {
    return `${title}\nNo records available.\n`;
  }

  return `${title}\n${buildTextTable(headers, rows)}\n`;
}

function buildTextTable(headers, rows) {
  const allRows = [headers, ...rows];

  const widths = headers.map((_, columnIndex) => {
    return Math.max(
      ...allRows.map((row) => String(row[columnIndex] ?? "").length)
    );
  });

  const divider = widths.map((width) => "-".repeat(width + 2)).join("+");

  const formatRow = (row) => {
    return row.map((cell, index) => {
      return ` ${String(cell ?? "").padEnd(widths[index])} `;
    }).join("|");
  };

  return [
    formatRow(headers),
    divider,
    ...rows.map(formatRow)
  ].join("\n");
}

function getLedgerTextRows() {
  let balance = 0;

  return ledgerRecords.map((record, index) => {
    if (record.type === "credit") {
      balance += Number(record.amount);
    } else {
      balance -= Number(record.amount);
    }

    return [
      index + 1,
      formatDate(record.date),
      record.description,
      record.type === "credit" ? formatMoney(record.amount) : "-",
      record.type === "debit" ? formatMoney(record.amount) : "-",
      formatMoney(balance)
    ];
  });
}

function getSalesTextRows() {
  return salesRecords.map((record, index) => [
    index + 1,
    formatDate(record.date),
    record.description,
    record.invoice || "-",
    formatMoney(record.amount),
    getMonthName(record.date)
  ]);
}

function getPurchaseTextRows() {
  return purchaseRecords.map((record, index) => [
    index + 1,
    formatDate(record.date),
    record.type || "Other",
    record.description,
    record.receipt || "-",
    formatNumber(record.quantity),
    formatMoney(record.price),
    formatMoney(record.amount),
    getMonthName(record.date)
  ]);
}

function getCostSalesTextRows() {
  return costSalesRecords.map((record, index) => [
    index + 1,
    formatDate(record.date),
    record.description,
    record.reference || "-",
    formatNumber(record.quantity),
    formatMoney(record.price),
    formatMoney(record.amount),
    getMonthName(record.date)
  ]);
}

function getAdvanceTextRows() {
  return advanceRecords.map((record, index) => [
    index + 1,
    formatDate(record.advanceDate),
    record.person,
    record.paymentMode,
    formatMoney(record.estimatedPrice),
    formatNumber(record.estimatedKg),
    formatDate(record.recoveryDate),
    record.recoveryType,
    formatNumber(record.grossWeight),
    formatNumber(record.netWeight),
    formatMoney(record.price),
    formatMoney(record.amount),
    formatNumber(record.excessDelivery)
  ]);
}

function getMonthlyTextRows() {
  const monthMap = buildMonthMap();

  return Object.keys(monthMap).sort().map((month) => {
    const data = monthMap[month];
    const grossProfit = data.costSales + data.purchases - data.sales;

    return [
      formatMonthKey(month),
      formatMoney(data.sales),
      formatMoney(data.purchases),
      formatMoney(data.costSales),
      formatMoney(grossProfit)
    ];
  });
}

/* =========================
   STORAGE AND HELPERS
========================= */

function saveAll() {
  localStorage.setItem("jasa_ledger_records", JSON.stringify(ledgerRecords));
  localStorage.setItem("jasa_sales_records", JSON.stringify(salesRecords));
  localStorage.setItem("jasa_purchase_records", JSON.stringify(purchaseRecords));
  localStorage.setItem("jasa_cost_sales_records", JSON.stringify(costSalesRecords));
  localStorage.setItem("jasa_advance_records", JSON.stringify(advanceRecords));
}

function renderAll() {
  renderLedger();
  renderSales();
  renderPurchases();
  renderCostSales();
  renderAdvance();
  renderDashboard();
  renderMonthlySummary();
  updateOnlineStatus();
}

function clearAllRecords() {
  if (!confirm("This will delete all Jasa Ventures records from this device. Continue?")) return;

  ledgerRecords = [];
  salesRecords = [];
  purchaseRecords = [];
  costSalesRecords = [];
  advanceRecords = [];

  saveAll();
  renderAll();
}

function getTotals() {
  const sales = sumRecords(salesRecords);
  const purchases = sumRecords(purchaseRecords);
  const costSales = sumRecords(costSalesRecords);
  const advances = sumRecords(advanceRecords);
  const grossProfit = costSales + purchases - sales;

  const credit = ledgerRecords
    .filter((record) => record.type === "credit")
    .reduce((sum, record) => sum + Number(record.amount), 0);

  const debit = ledgerRecords
    .filter((record) => record.type === "debit")
    .reduce((sum, record) => sum + Number(record.amount), 0);

  const balance = credit - debit;

  const records =
    ledgerRecords.length +
    salesRecords.length +
    purchaseRecords.length +
    costSalesRecords.length +
    advanceRecords.length;

  return {
    sales,
    purchases,
    costSales,
    advances,
    grossProfit,
    credit,
    debit,
    balance,
    records
  };
}

function hasAnyRecord() {
  return (
    ledgerRecords.length +
    salesRecords.length +
    purchaseRecords.length +
    costSalesRecords.length +
    advanceRecords.length
  ) > 0;
}

function sumRecords(records) {
  return records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateForFile(dateObject) {
  const day = String(dateObject.getDate()).padStart(2, "0");
  const month = String(dateObject.getMonth() + 1).padStart(2, "0");
  const year = dateObject.getFullYear();

  return `${day}-${month}-${year}`;
}

function getMonthKey(dateString) {
  return dateString.slice(0, 7);
}

function formatMonthKey(monthKey) {
  const [year, month] = monthKey.split("-");
  const date = new Date(year, Number(month) - 1, 1);

  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function getMonthName(dateString) {
  return formatMonthKey(getMonthKey(dateString));
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanCSV(value) {
  return String(value ?? "").replaceAll('"', '""');
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/* =========================
   ONLINE STATUS AND PWA
========================= */

function updateOnlineStatus() {
  if (navigator.onLine) {
    onlineStatus.textContent = "Online";
    onlineStatus.style.background = "#e8f5e9";
    onlineStatus.style.color = "#0f8a3a";
  } else {
    onlineStatus.textContent = "Offline Mode";
    onlineStatus.style.background = "#fff4e0";
    onlineStatus.style.color = "#9a6400";
  }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault();
  deferredPrompt = event;

  if (installBtn) {
    installBtn.style.display = "block";
  }
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
    });
  } else {
    alert("To install: open browser menu, then choose Add to Home Screen or Install App.");
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("service-worker.js")
      .then((registration) => {
        console.log("Service Worker registered:", registration.scope);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}