let ledgerRecords = JSON.parse(localStorage.getItem("jasa_ledger_records")) || [];
let salesRecords = JSON.parse(localStorage.getItem("jasa_sales_records")) || [];
let purchaseRecords = JSON.parse(localStorage.getItem("jasa_purchase_records")) || [];
let costSalesRecords = JSON.parse(localStorage.getItem("jasa_cost_sales_records")) || [];

let deferredPrompt = null;

const onlineStatus = document.getElementById("onlineStatus");
const installBtn = document.getElementById("installBtn");

setDefaultDates();
renderAll();

function setDefaultDates() {
  const today = new Date();

  const dateFields = [
    "ledgerDate",
    "salesDate",
    "purchaseDate",
    "costSalesDate"
  ];

  dateFields.forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.valueAsDate = today;
  });
}

function openPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active-page");
  });

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.remove("active");
  });

  document.getElementById(pageId).classList.add("active-page");
  event.target.classList.add("active");
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
    id: Date.now(),
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
      balance += record.amount;
    } else {
      balance -= record.amount;
    }

    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${record.date}</td>
        <td>${record.description}</td>
        <td class="credit">${record.type === "credit" ? formatMoney(record.amount) : "-"}</td>
        <td class="debit">${record.type === "debit" ? formatMoney(record.amount) : "-"}</td>
        <td>${formatMoney(balance)}</td>
        <td><button class="delete-btn" onclick="deleteLedger(${record.id})">Delete</button></td>
      </tr>
    `;
  });
}

function deleteLedger(id) {
  if (!confirm("Delete this ledger record?")) return;

  ledgerRecords = ledgerRecords.filter((record) => record.id !== id);
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
    id: Date.now(),
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
        <td>${record.date}</td>
        <td>${record.description}</td>
        <td>${record.invoice || "-"}</td>
        <td class="credit">${formatMoney(record.amount)}</td>
        <td>${getMonthName(record.date)}</td>
        <td><button class="delete-btn" onclick="deleteSale(${record.id})">Delete</button></td>
      </tr>
    `;
  });
}

function deleteSale(id) {
  if (!confirm("Delete this sales record?")) return;

  salesRecords = salesRecords.filter((record) => record.id !== id);
  saveAll();
  renderAll();
}

/* =========================
   PURCHASES
========================= */

document.getElementById("purchaseForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const date = document.getElementById("purchaseDate").value;
  const description = document.getElementById("purchaseDescription").value.trim();
  const receipt = document.getElementById("purchaseReceipt").value.trim();
  const amount = Number(document.getElementById("purchaseAmount").value);

  if (!date || !description || amount <= 0) {
    alert("Please enter valid purchase details.");
    return;
  }

  purchaseRecords.push({
    id: Date.now(),
    date,
    description,
    receipt,
    amount
  });

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("purchaseDate").valueAsDate = new Date();
});

function renderPurchases() {
  const table = document.getElementById("purchaseTable");
  const count = document.getElementById("purchaseCount");

  table.innerHTML = "";
  count.textContent = `${purchaseRecords.length} record${purchaseRecords.length === 1 ? "" : "s"}`;

  if (purchaseRecords.length === 0) {
    table.innerHTML = `<tr><td colspan="7" class="empty-row">No purchase records yet.</td></tr>`;
    return;
  }

  purchaseRecords.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${record.date}</td>
        <td>${record.description}</td>
        <td>${record.receipt || "-"}</td>
        <td class="debit">${formatMoney(record.amount)}</td>
        <td>${getMonthName(record.date)}</td>
        <td><button class="delete-btn" onclick="deletePurchase(${record.id})">Delete</button></td>
      </tr>
    `;
  });
}

function deletePurchase(id) {
  if (!confirm("Delete this purchase record?")) return;

  purchaseRecords = purchaseRecords.filter((record) => record.id !== id);
  saveAll();
  renderAll();
}

/* =========================
   COST OF SALES
========================= */

document.getElementById("costSalesForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const date = document.getElementById("costSalesDate").value;
  const description = document.getElementById("costSalesDescription").value.trim();
  const reference = document.getElementById("costSalesReference").value.trim();
  const amount = Number(document.getElementById("costSalesAmount").value);

  if (!date || !description || amount <= 0) {
    alert("Please enter valid cost of sales details.");
    return;
  }

  costSalesRecords.push({
    id: Date.now(),
    date,
    description,
    reference,
    amount
  });

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("costSalesDate").valueAsDate = new Date();
});

function renderCostSales() {
  const table = document.getElementById("costSalesTable");
  const count = document.getElementById("costSalesCount");

  table.innerHTML = "";
  count.textContent = `${costSalesRecords.length} record${costSalesRecords.length === 1 ? "" : "s"}`;

  if (costSalesRecords.length === 0) {
    table.innerHTML = `<tr><td colspan="7" class="empty-row">No cost of sales records yet.</td></tr>`;
    return;
  }

  costSalesRecords.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${record.date}</td>
        <td>${record.description}</td>
        <td>${record.reference || "-"}</td>
        <td class="debit">${formatMoney(record.amount)}</td>
        <td>${getMonthName(record.date)}</td>
        <td><button class="delete-btn" onclick="deleteCostSale(${record.id})">Delete</button></td>
      </tr>
    `;
  });
}

function deleteCostSale(id) {
  if (!confirm("Delete this cost of sales record?")) return;

  costSalesRecords = costSalesRecords.filter((record) => record.id !== id);
  saveAll();
  renderAll();
}

/* =========================
   DASHBOARD AND MONTHLY
========================= */

function renderDashboard() {
  const totalSales = sumRecords(salesRecords);
  const totalPurchases = sumRecords(purchaseRecords);
  const totalCostSales = sumRecords(costSalesRecords);
  const grossProfit = totalSales - totalCostSales;
  const totalCredit = ledgerRecords
    .filter((record) => record.type === "credit")
    .reduce((sum, record) => sum + record.amount, 0);

  const totalDebit = ledgerRecords
    .filter((record) => record.type === "debit")
    .reduce((sum, record) => sum + record.amount, 0);

  const balance = totalCredit - totalDebit;

  document.getElementById("totalSales").textContent = formatMoney(totalSales);
  document.getElementById("totalPurchases").textContent = formatMoney(totalPurchases);
  document.getElementById("totalCostSales").textContent = formatMoney(totalCostSales);
  document.getElementById("grossProfit").textContent = formatMoney(grossProfit);
  document.getElementById("ledgerBalance").textContent = formatMoney(balance);
  document.getElementById("totalCredit").textContent = formatMoney(totalCredit);
  document.getElementById("totalDebit").textContent = formatMoney(totalDebit);

  const allRecords =
    ledgerRecords.length +
    salesRecords.length +
    purchaseRecords.length +
    costSalesRecords.length;

  document.getElementById("totalRecords").textContent = allRecords;
}

function renderMonthlySummary() {
  const table = document.getElementById("monthlyTable");
  table.innerHTML = "";

  const monthMap = {};

  function addToMonth(records, key) {
    records.forEach((record) => {
      const month = getMonthKey(record.date);

      if (!monthMap[month]) {
        monthMap[month] = {
          sales: 0,
          purchases: 0,
          costSales: 0
        };
      }

      monthMap[month][key] += record.amount;
    });
  }

  addToMonth(salesRecords, "sales");
  addToMonth(purchaseRecords, "purchases");
  addToMonth(costSalesRecords, "costSales");

  const months = Object.keys(monthMap).sort();

  if (months.length === 0) {
    table.innerHTML = `<tr><td colspan="5" class="empty-row">No monthly records yet.</td></tr>`;
    return;
  }

  months.forEach((month) => {
    const data = monthMap[month];
    const grossProfit = data.sales - data.costSales;

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

/* =========================
   BACKUP, EMAIL, EXPORT
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
      balance += record.amount;
    } else {
      debit = record.amount;
      balance -= record.amount;
    }

    csv += `${record.date},"${record.description}",${credit},${debit},${balance}\n`;
  });

  csv += "\nSALES\n";
  csv += "Date,Description,Invoice,Amount,Month\n";

  salesRecords.forEach((record) => {
    csv += `${record.date},"${record.description}","${record.invoice || ""}",${record.amount},"${getMonthName(record.date)}"\n`;
  });

  csv += "\nPURCHASES\n";
  csv += "Date,Description,Receipt,Amount,Month\n";

  purchaseRecords.forEach((record) => {
    csv += `${record.date},"${record.description}","${record.receipt || ""}",${record.amount},"${getMonthName(record.date)}"\n`;
  });

  csv += "\nCOST OF SALES\n";
  csv += "Date,Description,Reference,Amount,Month\n";

  costSalesRecords.forEach((record) => {
    csv += `${record.date},"${record.description}","${record.reference || ""}",${record.amount},"${getMonthName(record.date)}"\n`;
  });

  csv += "\nMONTHLY SUMMARY\n";
  csv += "Month,Sales,Purchases,Cost of Sales,Gross Profit\n";

  const monthMap = {};

  function addToMonth(records, key) {
    records.forEach((record) => {
      const month = getMonthKey(record.date);

      if (!monthMap[month]) {
        monthMap[month] = {
          sales: 0,
          purchases: 0,
          costSales: 0
        };
      }

      monthMap[month][key] += record.amount;
    });
  }

  addToMonth(salesRecords, "sales");
  addToMonth(purchaseRecords, "purchases");
  addToMonth(costSalesRecords, "costSales");

  Object.keys(monthMap).sort().forEach((month) => {
    const data = monthMap[month];
    csv += `${formatMonthKey(month)},${data.sales},${data.purchases},${data.costSales},${data.sales - data.costSales}\n`;
  });

  return csv;
}

function downloadAllCSV() {
  const totalRecords =
    ledgerRecords.length +
    salesRecords.length +
    purchaseRecords.length +
    costSalesRecords.length;

  if (totalRecords === 0) {
    alert("No records available for download.");
    return;
  }

  const csv = generateFullCSV();
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "jasa_ventures_full_backup.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function backupToEmail() {
  const totalRecords =
    ledgerRecords.length +
    salesRecords.length +
    purchaseRecords.length +
    costSalesRecords.length;

  if (totalRecords === 0) {
    alert("No records available for email backup.");
    return;
  }

  if (!navigator.onLine) {
    alert("You are offline. Records are safely saved on this device. Connect to internet, then click Backup to Email again.");
    return;
  }

  const csv = generateFullCSV();

  /*
    Replace this email with the real backup email.
    Example:
    const email = "jasa.ventures@gmail.com";
  */
  const email = "your-email@example.com";

  const subject = "Jasa Ventures Backup";
  const body =
    "Hello,\n\nPlease find below the Jasa Ventures backup:\n\n" +
    csv +
    "\nRegards.";

  window.location.href =
    `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* =========================
   STORAGE AND HELPERS
========================= */

function saveAll() {
  localStorage.setItem("jasa_ledger_records", JSON.stringify(ledgerRecords));
  localStorage.setItem("jasa_sales_records", JSON.stringify(salesRecords));
  localStorage.setItem("jasa_purchase_records", JSON.stringify(purchaseRecords));
  localStorage.setItem("jasa_cost_sales_records", JSON.stringify(costSalesRecords));
}

function renderAll() {
  renderLedger();
  renderSales();
  renderPurchases();
  renderCostSales();
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

  saveAll();
  renderAll();
}

function sumRecords(records) {
  return records.reduce((sum, record) => sum + Number(record.amount), 0);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString();
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
