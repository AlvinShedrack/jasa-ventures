let ledgerRecords = JSON.parse(localStorage.getItem("jasa_ledger_records")) || [];
let salesRecords = JSON.parse(localStorage.getItem("jasa_sales_records")) || [];
let purchaseRecords = JSON.parse(localStorage.getItem("jasa_purchase_records")) || [];
let costSalesRecords = JSON.parse(localStorage.getItem("jasa_cost_sales_records")) || [];
let advanceRecords = JSON.parse(localStorage.getItem("jasa_advance_records")) || [];

let deferredPrompt = null;

let editingRecord = {
  ledger: null,
  sales: null,
  purchase: null,
  costSales: null,
  advance: null
};
const salesQuantityInput = document.getElementById("salesQuantity");
const salesPriceInput = document.getElementById("salesPrice");
const salesAmountInput = document.getElementById("salesAmount");
const salesAmountPaidInput = document.getElementById("salesAmountPaid");
const salesPaidByInput = document.getElementById("salesPaidBy");
const salesBalanceInput = document.getElementById("salesBalanceRemaining");


/* =========================
   USER AUTHENTICATION & ROLES
========================= */
let users = JSON.parse(localStorage.getItem("jasa_users")) || [
  { username: "admin", password: "admin", role: "admin" }
];
let currentUser = JSON.parse(localStorage.getItem("jasa_current_user")) || null;

// Handle Login Form Submission
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  const foundUser = users.find(u => u.username === username && u.password === password);
  if (foundUser) {
    currentUser = foundUser;
    localStorage.setItem("jasa_current_user", JSON.stringify(currentUser));
    applyUserPermissions();
    document.getElementById("loginScreen").style.display = "none";
    this.reset();
  } else {
    alert("Invalid username or password.");
  }
});

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("jasa_current_user");
  document.getElementById("loginScreen").style.display = "flex";
  location.reload();
}

// User Management Modal Actions (Admin only)
function openUserModal() {
  if (!currentUser || currentUser.role !== "admin") return;
  renderUserList();
  document.getElementById("userModal").style.display = "flex";
}

function closeUserModal() {
  document.getElementById("userModal").style.display = "none";
}

document.getElementById("addUserForm").addEventListener("submit", function (e) {
  e.preventDefault();
  if (!currentUser || currentUser.role !== "admin") return;

  const username = document.getElementById("newUsername").value.trim();
  const password = document.getElementById("newPassword").value;
  const role = document.getElementById("newUserRole").value;

  if (users.some(u => u.username === username)) {
    alert("Username already exists.");
    return;
  }

  users.push({ username, password, role });
  localStorage.setItem("jasa_users", JSON.stringify(users));
  alert("User created successfully!");
  this.reset();
  renderUserList();
});

function renderUserList() {
  const container = document.getElementById("userListContainer");
  container.innerHTML = "";
  users.forEach((u, idx) => {
    container.innerHTML += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid #eee;">
        <span><strong>${escapeHTML(u.username)}</strong> (${u.role})</span>
        ${u.username !== "admin" ? `<button class="delete-btn" style="padding: 2px 6px; font-size: 11px;" onclick="deleteUser('${u.username}')">Delete</button>` : ""}
      </div>
    `;
  });
}

function deleteUser(username) {
  if (username === "admin") {
    alert("Cannot delete primary admin.");
    return;
  }
  if (!confirm(`Delete user ${username}?`)) return;
  users = users.filter(u => u.username !== username);
  localStorage.setItem("jasa_users", JSON.stringify(users));
  renderUserList();
}

// Apply role-based visibility upon loading or login
function applyUserPermissions() {
  if (!currentUser) {
    document.getElementById("loginScreen").style.display = "flex";
    return;
  }

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("userInfoDisplay").textContent = `User: ${currentUser.username} (${currentUser.role.toUpperCase()});`;

  const tabDashboard = document.getElementById("tabDashboard");
  const tabMonthly = document.getElementById("tabMonthly");
  const manageUsersBtn = document.getElementById("manageUsersBtn");

  if (currentUser.role === "employee") {
    // Hide Dashboard & Monthly Summary tabs for employees[cite: 1]
    if (tabDashboard) tabDashboard.style.display = "none";
    if (tabMonthly) tabMonthly.style.display = "none";
    if (manageUsersBtn) manageUsersBtn.style.display = "none";

    // Default employee to Ledger view if active page is restricted
    const activePage = document.querySelector(".page.active-page");
    if (activePage && (activePage.id === "dashboard" || activePage.id === "monthly")) {
      openPage("ledger", document.querySelector("button[onclick*='ledger']"));
    }
  } else if (currentUser.role === "admin") {
    if (tabDashboard) tabDashboard.style.display = "";
    if (tabMonthly) tabMonthly.style.display = "";
    if (manageUsersBtn) manageUsersBtn.style.display = "";
  }
}

// Run permission check on DOM load
document.addEventListener("DOMContentLoaded", () => {
  if (currentUser) {
    applyUserPermissions();
  } else {
    document.getElementById("loginScreen").style.display = "flex";
  }
});

function updateSalesValues() {
  const qty = Number(salesQuantityInput.value) || 0;
  const price = Number(salesPriceInput.value) || 0;
  const amount = qty * price;
  if (salesAmountInput) salesAmountInput.value = amount.toFixed(2);
  updateSalesBalance();
}

function updateSalesBalance() {
  const amount = Number(salesAmountInput?.value) || 0;
  const paid = Number(salesAmountPaidInput?.value) || 0;
  if (salesBalanceInput) salesBalanceInput.value = Math.max(amount - paid, 0).toFixed(2);
}

[salesQuantityInput, salesPriceInput].forEach((input) => {
  if (input) input.addEventListener("input", updateSalesValues);
});
if (salesAmountPaidInput) {
  salesAmountPaidInput.addEventListener("input", updateSalesBalance);
}


const advEstPriceInput = document.getElementById("advanceEstimatedPrice");
const advEstKgInput = document.getElementById("advanceEstimatedKg");
const advAmountReceivedInput = document.getElementById("advanceAmountReceived");

const advNetWeightInput = document.getElementById("advanceNetWeight");
const advPriceInput = document.getElementById("advancePrice");
const advAmountRecoveredInput = document.getElementById("advanceAmountRecovered");
const advExcessDeliveryInput = document.getElementById("advanceExcessDelivery");

// Amount Received = Estimated Price * Estimated Kg
[advEstPriceInput, advEstKgInput].forEach(input => {
  input.addEventListener("input", () => {
    const estPrice = Number(advEstPriceInput.value) || 0;
    const estKg = Number(advEstKgInput.value) || 0;
    advAmountReceivedInput.value = (estPrice * estKg).toFixed(2);
    updateExcessDelivery();
  });
});

// Amount Recovered = Net Weight * Price
[advNetWeightInput, advPriceInput].forEach(input => {
  input.addEventListener("input", () => {
    const netWeight = Number(advNetWeightInput.value) || 0;
    const price = Number(advPriceInput.value) || 0;
    advAmountRecoveredInput.value = (netWeight * price).toFixed(2);
    updateExcessDelivery();
  });
});

// Excess Delivery = Amount Received - Amount Recovered
function updateExcessDelivery() {
  const received = Number(advAmountReceivedInput.value) || 0;
  const recovered = Number(advAmountRecoveredInput.value) || 0;
  advExcessDeliveryInput.value = (received - recovered).toFixed(2);
}

const onlineStatus = document.getElementById("onlineStatus");
const installBtn = document.getElementById("installBtn");

const syncBtn = document.getElementById("syncBtn");
const syncStatus = document.getElementById("syncStatus");

/*
  Replace these with your Supabase Project URL and anon/public key.
  All devices must use the same URL, anon key, and SUPABASE_SYNC_KEY.
*/
const SUPABASE_URL = "https://yzojckfksrrenwzlsbhg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_x-6AyRV9tEsMzj1O-wXf4w_vYHHozwd";

const SUPABASE_SYNC_TABLE = "jasa_device_sync";
const SUPABASE_SYNC_KEY = "jasa_ventures_main";

let syncBooting = true;
let syncInProgress = false;
let syncTimer = null;

const supabaseClient =
  window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
/*
  Replace this email with the email where Jasa Ventures backups should be sent.
*/
const BACKUP_EMAIL = "alvinshedrack90@gmail.com";
const DEVELOPER_NAME = "Alvin Shedrack";
const DEVELOPER_CONTACT = "0755393000";

/*
  Your Formspree endpoint.
*/
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xjgzykol";

setDefaultDates();
attachFormulaListeners();
migrateOldRecords();
renderAll();

syncBooting = false;

if (navigator.onLine) {
  queueSupabaseSync(1000);
}

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

  const purchaseAmountPaidField = document.getElementById("purchaseAmountPaid");
  if (purchaseAmountPaidField) purchaseAmountPaidField.addEventListener("input", updatePurchaseBalance);

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
  const amount = quantity * price;
  document.getElementById("purchaseAmount").value = amount || "";
  updatePurchaseBalance();
}

function updatePurchaseBalance() {
  const amount = Number(document.getElementById("purchaseAmount").value) || 0;
  const paid = Number(document.getElementById("purchaseAmountPaid")?.value) || 0;
  const balance = Math.max(amount - paid, 0);
  document.getElementById("purchaseBalanceRemaining").value = balance.toFixed(2);
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
  salesRecords = salesRecords.map((record) => ({
    ...record,
    quantity: Number(record.quantity || 0),
    price: Number(record.price || 0),
    amount: Number(record.amount || (Number(record.quantity || 0) * Number(record.price || 0))),
    amountPaid: Number(record.amountPaid || 0),
    paidBy: record.paidBy || "",
    balanceRemaining: Number(record.balanceRemaining ?? (Number(record.amount || 0) - Number(record.amountPaid || 0)))
  }));

  purchaseRecords = purchaseRecords.map((record) => ({
    ...record,
    type: record.type || "Other",
    quantity: Number(record.quantity || 1),
    price: Number(record.price || record.amount || 0),
    amount: Number(record.amount || (Number(record.quantity || 1) * Number(record.price || 0))),
    boughtBy: record.boughtBy || "",
    amountPaid: Number(record.amountPaid || 0),
    balanceRemaining: Number(record.balanceRemaining ?? (Number(record.amount || 0) - Number(record.amountPaid || 0)))
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

  const newRecord = {
    id: editingRecord.ledger || createId(),
    date,
    description,
    type,
    amount,
    _updatedAt: Date.now()
  };

  if (editingRecord.ledger) {
    ledgerRecords = ledgerRecords.map((record) =>
      String(record.id) === String(editingRecord.ledger) ? newRecord : record
    );
    editingRecord.ledger = null;
    document.getElementById("ledgerSubmitBtn").textContent = "Add Entry";
  } else {
    ledgerRecords.push(newRecord);
  }

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("ledgerDate").valueAsDate = new Date();
});


function renderLedger() {
  const table = document.getElementById("ledgerTable");
  const count = document.getElementById("ledgerCount");
  const query = (document.getElementById("ledgerSearch")?.value || "").trim().toLowerCase();

  const isEmployee = currentUser && currentUser.role === "employee";
  const balanceHeader = document.getElementById("ledgerBalanceHeader");
  if (balanceHeader) {
    balanceHeader.style.display = isEmployee ? "none" : "";
  }

  // First sort chronologically to compute running balance accurately
  ledgerRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Compute running balance map or array
  let runningBalance = 0;
  const ledgerWithBalances = ledgerRecords.map((record) => {
    if (record.type === "credit") {
      runningBalance += Number(record.amount);
    } else {
      runningBalance -= Number(record.amount);
    }
    return { ...record, calculatedBalance: runningBalance };
  });

  const filtered = query
    ? ledgerWithBalances.filter((r) => (r.description || "").toLowerCase().includes(query))
    : [...ledgerWithBalances];

  // Now sort descending so latest date is on top for UI display
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  table.innerHTML = "";
  count.textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    table.innerHTML = `<tr><td colspan="${isEmployee ? 6 : 7}" class="empty-row">No ledger records found.</td></tr>`;
    return;
  }

  filtered.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(record.date)}</td>
        <td>${escapeHTML(record.description)}</td>
        <td class="credit">${record.type === "credit" ? formatMoney(record.amount) : "-"}</td>
        <td class="debit">${record.type === "debit" ? formatMoney(record.amount) : "-"}</td>
        ${isEmployee ? "" : `<td>${formatMoney(record.calculatedBalance)}</td>`}
        <td>
          <div class="action-buttons">
            <button class="edit-btn" onclick="editLedger('${record.id}')">Edit</button>
            <button class="delete-btn" onclick="deleteLedger('${record.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  });
}

function deleteLedger(id) {
  if (!confirm("Delete this ledger record?")) return;

  ledgerRecords = ledgerRecords.filter((record) => String(record.id) !== String(id));
   setLocalUpdatedAt(Date.now());
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
  const quantity = Number(document.getElementById("salesQuantity").value) || 0;
  const price = Number(document.getElementById("salesPrice").value) || 0;
  const amount = Number(document.getElementById("salesAmount").value) || quantity * price;
  const amountPaid = Number(document.getElementById("salesAmountPaid").value) || 0;
  const paidBy = document.getElementById("salesPaidBy").value.trim();
  const balanceRemaining = Math.max(amount - amountPaid, 0);

  // Detailed validation with field-specific messages
  const errors = [];
  if (!date) errors.push("Date is required.");
  if (!description) errors.push("Description / Customer is required.");
  if (quantity <= 0) errors.push("Quantity must be greater than zero.");
  if (price <= 0) errors.push("Price must be greater than zero.");
  if (amountPaid < 0) errors.push("Amount paid must be zero or more.");
  if (amountPaid > amount) errors.push("Amount paid cannot exceed total amount.");

  if (errors.length) {
    alert("Please fix the following:\n- " + errors.join("\n- "));
    return;
  }

  const newRecord = {
    id: editingRecord.sales || createId(),
    date,
    description,
    invoice,
    quantity,
    price,
    amount,
    amountPaid,
    paidBy,
    balanceRemaining,
    _updatedAt: Date.now()
  };

  if (editingRecord.sales) {
    salesRecords = salesRecords.map(r => r.id === editingRecord.sales ? newRecord : r);
    editingRecord.sales = null;
    document.getElementById("salesSubmitBtn").textContent = "Add Sale";
    // hide cancel button when edit completes
    const cancelBtn = document.getElementById("salesCancelBtn");
    if (cancelBtn) cancelBtn.style.display = 'none';
  } else {
    salesRecords.push(newRecord);
  }

  saveAll();
  renderAll();
  this.reset();
  document.getElementById("salesDate").valueAsDate = new Date();
});

// Search/filter support for sales
function clearSalesSearch() {
  const el = document.getElementById("salesSearch");
  if (el) {
    el.value = "";
    renderSales();
  }
}

function clearLedgerSearch() {
  const el = document.getElementById("ledgerSearch");
  if (el) {
    el.value = "";
    renderLedger();
  }
}

function clearPurchaseSearch() {
  const el = document.getElementById("purchaseSearch");
  if (el) {
    el.value = "";
    renderPurchases();
  }
}

function clearCostSalesSearch() {
  const el = document.getElementById("costSalesSearch");
  if (el) {
    el.value = "";
    renderCostSales();
  }
}

function clearAdvanceSearch() {
  const el = document.getElementById("advanceSearch");
  if (el) {
    el.value = "";
    renderAdvances();
  }
}

// If the search input is already present, attach listener immediately (script loaded at end of body).
const _salesSearchEl = document.getElementById("salesSearch");
if (_salesSearchEl) {
  _salesSearchEl.addEventListener("input", () => renderSales());
} else {
  document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("salesSearch");
    if (search) search.addEventListener("input", () => renderSales());
  });
}

// ledger search
const _ledgerSearchEl = document.getElementById("ledgerSearch");
if (_ledgerSearchEl) {
  _ledgerSearchEl.addEventListener("input", () => renderLedger());
} else {
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.getElementById("ledgerSearch");
    if (s) s.addEventListener("input", () => renderLedger());
  });
}

// purchase search
const _purchaseSearchEl = document.getElementById("purchaseSearch");
if (_purchaseSearchEl) {
  _purchaseSearchEl.addEventListener("input", () => renderPurchases());
} else {
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.getElementById("purchaseSearch");
    if (s) s.addEventListener("input", () => renderPurchases());
  });
}

// costSales search
const _costSalesSearchEl = document.getElementById("costSalesSearch");
if (_costSalesSearchEl) {
  _costSalesSearchEl.addEventListener("input", () => renderCostSales());
} else {
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.getElementById("costSalesSearch");
    if (s) s.addEventListener("input", () => renderCostSales());
  });
}

// advance search
const _advanceSearchEl = document.getElementById("advanceSearch");
if (_advanceSearchEl) {
  _advanceSearchEl.addEventListener("input", () => renderAdvances());
} else {
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.getElementById("advanceSearch");
    if (s) s.addEventListener("input", () => renderAdvances());
  });
}

function cancelEditSale() {
  // Clear edit state and reset form
  editingRecord.sales = null;
  const form = document.getElementById("salesForm");
  if (form) form.reset();
  document.getElementById("salesDate").valueAsDate = new Date();
  document.getElementById("salesSubmitBtn").textContent = "Add Sale";
  const cancelBtn = document.getElementById("salesCancelBtn");
  if (cancelBtn) cancelBtn.style.display = 'none';
}

function sortByLatestDate(a, b) {
  const dateA = new Date(a.date || a.advanceDate || 0);
  const dateB = new Date(b.date || b.advanceDate || 0);
  return dateB - dateA; // Descending order (newest date first)
}

function renderSales() {
  const table = document.getElementById("salesTable");
  const count = document.getElementById("salesCount");
  const query = (document.getElementById("salesSearch")?.value || "").trim().toLowerCase();

  const filtered = query
    ? salesRecords.filter((r) => (r.description || "").toLowerCase().includes(query) || (r.invoice || "").toLowerCase().includes(query))
    : [...salesRecords];

  filtered.sort(sortByLatestDate);

  table.innerHTML = "";
  count.textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    table.innerHTML = `<tr><td colspan="12" class="empty-row">No sales records found.</td></tr>`;
    return;
  }

  filtered.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(record.date)}</td>
        <td>${escapeHTML(record.description)}</td>
        <td>${escapeHTML(record.invoice || "-")}</td>
        <td>${formatNumber(record.quantity)}</td>
        <td>${formatMoney(record.price)}</td>
        <td>${formatMoney(record.amount)}</td>
        <td>${formatMoney(record.amountPaid || 0)}</td>
        <td>${escapeHTML(record.paidBy || "-")}</td>
        <td>${formatMoney(record.balanceRemaining || 0)}</td>
        <td>${escapeHTML(record.month || "-")}</td>
        <td>
          <div class="action-buttons">
            <button class="edit-btn" onclick="editSale('${record.id}')">Edit</button>
            <button class="delete-btn" onclick="deleteSale('${record.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  });
}


function deleteSale(id) {
  if (!confirm("Delete this sales record?")) return;

  salesRecords = salesRecords.filter((record) => String(record.id) !== String(id));
  setLocalUpdatedAt(Date.now());
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
  const boughtBy = document.getElementById("purchaseBoughtBy").value.trim();
  const quantity = Number(document.getElementById("purchaseQuantity").value);
  const price = Number(document.getElementById("purchasePrice").value);
  const amount = quantity * price;
  const amountPaid = Number(document.getElementById("purchaseAmountPaid").value) || 0;
  const balanceRemaining = Math.max(amount - amountPaid, 0);

  const errors = [];
  if (!date) errors.push("Date is required.");
  if (!type) errors.push("Purchase type is required.");
  if (!description) errors.push("Supplier / Description is required.");
  if (!boughtBy) errors.push("Bought by is required.");
  if (quantity <= 0) errors.push("Quantity must be greater than zero.");
  if (price <= 0) errors.push("Price must be greater than zero.");
  if (amount <= 0) errors.push("Amount must be greater than zero.");
  if (amountPaid < 0) errors.push("Amount paid must be zero or more.");
  if (amountPaid > amount) errors.push("Amount paid cannot exceed total amount.");

  if (errors.length) {
    alert("Please fix the following:\n- " + errors.join("\n- "));
    return;
  }

  const newRecord = {
    id: editingRecord.purchase || createId(),
    date,
    type,
    description,
    receipt,
    boughtBy,
    quantity,
    price,
    amount,
    amountPaid,
    balanceRemaining,
    _updatedAt: Date.now()
  };

  if (editingRecord.purchase) {
    purchaseRecords = purchaseRecords.map((record) =>
      String(record.id) === String(editingRecord.purchase) ? newRecord : record
    );
    editingRecord.purchase = null;
    document.getElementById("purchaseSubmitBtn").textContent = "Add Purchase";
  } else {
    purchaseRecords.push(newRecord);
  }

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("purchaseDate").valueAsDate = new Date();
  document.getElementById("purchaseAmount").value = "";
});

function renderPurchases() {
  const table = document.getElementById("purchaseTable");
  const count = document.getElementById("purchaseCount");
  const query = (document.getElementById("purchaseSearch")?.value || "").trim().toLowerCase();

  const filtered = query
    ? purchaseRecords.filter((r) => (r.description || "").toLowerCase().includes(query) || (r.receipt || "").toLowerCase().includes(query))
    : [...purchaseRecords];

  filtered.sort(sortByLatestDate);

  table.innerHTML = "";
  count.textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    table.innerHTML = `<tr><td colspan="13" class="empty-row">No purchase records found.</td></tr>`;
    return;
  }

  filtered.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(record.date)}</td>
        <td>${escapeHTML(record.type)}</td>
        <td>${escapeHTML(record.description)}</td>
        <td>${escapeHTML(record.receipt || "-")}</td>
        <td>${escapeHTML(record.boughtBy)}</td>
        <td>${formatNumber(record.quantity)}</td>
        <td>${formatMoney(record.price)}</td>
        <td>${formatMoney(record.amount)}</td>
        <td>${formatMoney(record.amountPaid || 0)}</td>
        <td>${formatMoney(record.balanceRemaining || 0)}</td>
        <td>${escapeHTML(record.month || "-")}</td>
        <td>
          <div class="action-buttons">
            <button class="edit-btn" onclick="editPurchase('${record.id}')">Edit</button>
            <button class="delete-btn" onclick="deletePurchase('${record.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  });
}

function deletePurchase(id) {
  if (!confirm("Delete this purchase record?")) return;

  purchaseRecords = purchaseRecords.filter((record) => String(record.id) !== String(id));
  setLocalUpdatedAt(Date.now());
  saveAll();
  renderAll();
}

function generateSalesReceipt(id) {
  const record = salesRecords.find((r) => String(r.id) === String(id));
  if (!record) {
    alert("Sales record not found.");
    return;
  }

  const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sales Receipt - ${escapeHTML(record.invoice || "No Invoice")}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #222;
      margin: 20px;
      background: white;
    }
    .receipt-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      border: 2px solid #243865;
      border-radius: 10px;
      padding: 20px;
      background: white;
    }
    .receipt-header {
      text-align: center;
      border-bottom: 2px solid #243865;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .receipt-header h1 {
      color: #243865;
      margin: 0 0 5px;
      font-size: 24px;
    }
    .receipt-header p {
      margin: 3px 0;
      color: #666;
      font-size: 12px;
    }
    .receipt-content {
      margin: 20px 0;
    }
    .receipt-section {
      margin-bottom: 20px;
    }
    .receipt-section h3 {
      color: #243865;
      margin: 10px 0 8px;
      font-size: 14px;
      text-transform: uppercase;
      border-bottom: 1px solid #e7ad4a;
      padding-bottom: 5px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .receipt-row label {
      font-weight: bold;
      color: #243865;
      min-width: 120px;
    }
    .receipt-row value {
      text-align: right;
      color: #333;
    }
    .receipt-total {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #243865;
      font-weight: bold;
      font-size: 16px;
      color: #243865;
    }
    .receipt-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 11px;
      color: #666;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .receipt-container { border: none; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <h1>SALES RECEIPT</h1>
      <p>Jasa Ventures</p>
      <p>Generated: ${formatDateTimeForReport(new Date())}</p>
    </div>
    
    <div class="receipt-content">
      <div class="receipt-section">
        <h3>Invoice Details</h3>
        <div class="receipt-row">
          <label>Invoice No:</label>
          <value>${escapeHTML(record.invoice || "N/A")}</value>
        </div>
        <div class="receipt-row">
          <label>Date:</label>
          <value>${formatDate(record.date)}</value>
        </div>
      </div>

      <div class="receipt-section">
        <h3>Customer Details</h3>
        <div class="receipt-row">
          <label>Customer:</label>
          <value>${escapeHTML(record.description)}</value>
        </div>
        <div class="receipt-row">
          <label>Paid By:</label>
          <value>${escapeHTML(record.paidBy || "-")}</value>
        </div>
      </div>

      <div class="receipt-section">
        <h3>Sale Details</h3>
        <div class="receipt-row">
          <label>Quantity:</label>
          <value>${formatNumber(record.quantity)}</value>
        </div>
        <div class="receipt-row">
          <label>Unit Price:</label>
          <value>${formatMoney(record.price)}</value>
        </div>
        <div class="receipt-row">
          <label>Total Amount:</label>
          <value>${formatMoney(record.amount)}</value>
        </div>
        <div class="receipt-row">
          <label>Amount Paid:</label>
          <value>${formatMoney(record.amountPaid || 0)}</value>
        </div>
        <div class="receipt-row">
          <label>Balance:</label>
          <value>${formatMoney(record.balanceRemaining ?? (record.amount - Number(record.amountPaid || 0)))}</value>
        </div>
      </div>

      <div class="receipt-section">
        <h3>Additional Info</h3>
        <div class="receipt-row">
          <label>Month:</label>
          <value>${getMonthName(record.date)}</value>
        </div>
      </div>
    </div>

    <div class="receipt-footer">
      <p>This is a system-generated receipt. Retain for your records.</p>
      <p>&copy; 2026 Jasa Ventures. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  printWindow.document.open();
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
  
  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
  };
}

function generatePurchaseReceipt(id) {
  const record = purchaseRecords.find((r) => String(r.id) === String(id));
  if (!record) {
    alert("Purchase record not found.");
    return;
  }

  const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Receipt - ${escapeHTML(record.receipt || "No Receipt")}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #222;
      margin: 20px;
      background: white;
    }
    .receipt-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      border: 2px solid #243865;
      border-radius: 10px;
      padding: 20px;
      background: white;
    }
    .receipt-header {
      text-align: center;
      border-bottom: 2px solid #243865;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .receipt-header h1 {
      color: #243865;
      margin: 0 0 5px;
      font-size: 24px;
    }
    .receipt-header p {
      margin: 3px 0;
      color: #666;
      font-size: 12px;
    }
    .receipt-content {
      margin: 20px 0;
    }
    .receipt-section {
      margin-bottom: 20px;
    }
    .receipt-section h3 {
      color: #243865;
      margin: 10px 0 8px;
      font-size: 14px;
      text-transform: uppercase;
      border-bottom: 1px solid #e7ad4a;
      padding-bottom: 5px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .receipt-row label {
      font-weight: bold;
      color: #243865;
      min-width: 120px;
    }
    .receipt-row value {
      text-align: right;
      color: #333;
    }
    .receipt-total {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #243865;
      font-weight: bold;
      font-size: 16px;
      color: #243865;
    }
    .receipt-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 11px;
      color: #666;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .receipt-container { border: none; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <h1>PURCHASE RECEIPT</h1>
      <p>Jasa Ventures</p>
      <p>Generated: ${formatDateTimeForReport(new Date())}</p>
    </div>
    
    <div class="receipt-content">
      <div class="receipt-section">
        <h3>Receipt Details</h3>
        <div class="receipt-row">
          <label>Receipt No:</label>
          <value>${escapeHTML(record.receipt || "N/A")}</value>
        </div>
        <div class="receipt-row">
          <label>Date:</label>
          <value>${formatDate(record.date)}</value>
        </div>
        <div class="receipt-row">
          <label>Bought By:</label>
          <value>${escapeHTML(record.boughtBy || "-")}</value>
        </div>
        <div class="receipt-row">
          <label>Amount Paid:</label>
          <value>${formatMoney(record.amountPaid || 0)}</value>
        </div>
        <div class="receipt-row">
          <label>Balance:</label>
          <value>${formatMoney(record.balanceRemaining ?? (record.amount - Number(record.amountPaid || 0)))}</value>
        </div>
      </div>

      <div class="receipt-section">
        <h3>Supplier / Item Details</h3>
        <div class="receipt-row">
          <label>Supplier:</label>
          <value>${escapeHTML(record.description)}</value>
        </div>
        <div class="receipt-row">
          <label>Type:</label>
          <value>${escapeHTML(record.type || "Other")}</value>
        </div>
        <div class="receipt-row">
          <label>Quantity:</label>
          <value>${formatNumber(record.quantity)}</value>
        </div>
        <div class="receipt-row">
          <label>Unit Price:</label>
          <value>${formatMoney(record.price)}</value>
        </div>
      </div>

      <div class="receipt-section">
        <div class="receipt-total">
          <span>Total Amount:</span>
          <span>${formatMoney(record.amount)}</span>
        </div>
      </div>

      <div class="receipt-section">
        <h3>Additional Info</h3>
        <div class="receipt-row">
          <label>Month:</label>
          <value>${getMonthName(record.date)}</value>
        </div>
      </div>
    </div>

    <div class="receipt-footer">
      <p>This is a system-generated receipt. Retain for your records.</p>
      <p>&copy; 2026 Jasa Ventures. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  printWindow.document.open();
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
  
  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
  };
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

  const newRecord = {
    id: editingRecord.costSales || createId(),
    date,
    description,
    reference,
    quantity,
    price,
    amount,
    _updatedAt: Date.now()
  };

  if (editingRecord.costSales) {
    costSalesRecords = costSalesRecords.map((record) =>
      String(record.id) === String(editingRecord.costSales) ? newRecord : record
    );
    editingRecord.costSales = null;
    document.getElementById("costSalesSubmitBtn").textContent = "Add Cost";
  } else {
    costSalesRecords.push(newRecord);
  }

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("costSalesDate").valueAsDate = new Date();
  document.getElementById("costSalesAmount").value = "";
});

function renderCostSales() {
  const table = document.getElementById("costSalesTable");
  const count = document.getElementById("costSalesCount");
  const query = (document.getElementById("costSalesSearch")?.value || "").trim().toLowerCase();

  const filtered = query
    ? costSalesRecords.filter((r) => (r.description || "").toLowerCase().includes(query) || (r.reference || "").toLowerCase().includes(query))
    : [...costSalesRecords];

  filtered.sort(sortByLatestDate);

  table.innerHTML = "";
  count.textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    table.innerHTML = `<tr><td colspan="9" class="empty-row">No cost of sales records found.</td></tr>`;
    return;
  }

  filtered.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(record.date)}</td>
        <td>${escapeHTML(record.description)}</td>
        <td>${escapeHTML(record.reference || "-")}</td>
        <td>${formatNumber(record.quantity)}</td>
        <td>${formatMoney(record.price)}</td>
        <td>${formatMoney(record.amount)}</td>
        <td>${escapeHTML(record.month || "-")}</td>
        <td>
          <div class="action-buttons">
            <button class="edit-btn" onclick="editCostSale('${record.id}')">Edit</button>
            <button class="delete-btn" onclick="deleteCostSale('${record.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  });
}

function deleteCostSale(id) {
  if (!confirm("Delete this cost of sales record?")) return;

  costSalesRecords = costSalesRecords.filter((record) => String(record.id) !== String(id));
    setLocalUpdatedAt(Date.now());
  saveAll();
  renderAll();
}

/* =========================
   ADVANCE
========================= */
// ------------------- ADVANCE -------------------
document.getElementById("advanceForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const advanceDate = document.getElementById("advanceDate").value;
  const person = document.getElementById("advancePerson").value.trim();
  const paymentMode = document.getElementById("advancePaymentMode").value;
  const estimatedPrice = Number(document.getElementById("advanceEstimatedPrice").value) || 0;
  const estimatedKg = Number(document.getElementById("advanceEstimatedKg").value) || 0;
  const amountReceived = estimatedPrice * estimatedKg;

  const recoveryDate = document.getElementById("advanceRecoveryDate").value;
  const recoveryType = document.getElementById("advanceRecoveryType").value;
  const grossWeight = Number(document.getElementById("advanceGrossWeight").value) || 0;
  const netWeight = Number(document.getElementById("advanceNetWeight").value) || 0;
  const price = Number(document.getElementById("advancePrice").value) || 0;
  const amountRecovered = netWeight * price;
  const excessDelivery = amountReceived - amountRecovered;

  if (
    !advanceDate ||
    !person ||
    !paymentMode ||
    !recoveryDate ||
    !recoveryType ||
    estimatedPrice <= 0 ||
    estimatedKg <= 0
  ) {
    alert("Please enter valid advance details.");
    return;
  }

  const newRecord = {
    id: editingRecord.advance || createId(),
    advanceDate,
    person,
    paymentMode,
    estimatedPrice,
    estimatedKg,
    amountReceived,
    recoveryDate,
    recoveryType,
    grossWeight,
    netWeight,
    price,
    amountRecovered,
    excessDelivery,
    _updatedAt: Date.now()
  };

  if (editingRecord.advance) {
    advanceRecords = advanceRecords.map(record =>
      String(record.id) === String(editingRecord.advance) ? newRecord : record
    );
    editingRecord.advance = null;
    document.getElementById("advanceSubmitBtn").textContent = "Add Advance";
  } else {
    advanceRecords.push(newRecord);
  }

  saveAll();
  renderAll();

  this.reset();
  document.getElementById("advanceDate").valueAsDate = new Date();
  document.getElementById("advanceRecoveryDate").valueAsDate = new Date();
  document.getElementById("advanceAmountReceived").value = "";
  document.getElementById("advanceAmountRecovered").value = "";
  document.getElementById("advanceExcessDelivery").value = "";
});

// ------------------- ADVANCE RENDER -------------------
function renderAdvances() {
  const table = document.getElementById("advanceTable");
  const count = document.getElementById("advanceCount");
  const query = (document.getElementById("advanceSearch")?.value || "").trim().toLowerCase();

  const filtered = query
    ? advanceRecords.filter((r) => (r.person || "").toLowerCase().includes(query) || (r.paymentMode || "").toLowerCase().includes(query))
    : [...advanceRecords];

  filtered.sort(sortByLatestDate);

  table.innerHTML = "";
  count.textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    table.innerHTML = `<tr><td colspan="15" class="empty-row">No advance records found.</td></tr>`;
    return;
  }

  filtered.forEach((record, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(record.advanceDate)}</td>
        <td>${escapeHTML(record.person)}</td>
        <td>${escapeHTML(record.paymentMode)}</td>
        <td>${formatMoney(record.estimatedPrice)}</td>
        <td>${formatNumber(record.estimatedKg)}</td>
        <td>${formatMoney(record.amountReceived)}</td>
        <td>${formatDate(record.recoveryDate)}</td>
        <td>${escapeHTML(record.recoveryType)}</td>
        <td>${formatNumber(record.grossWeight)}</td>
        <td>${formatNumber(record.netWeight)}</td>
        <td>${formatMoney(record.price)}</td>
        <td>${formatMoney(record.amountRecovered)}</td>
        <td>${formatNumber(record.excessDelivery)}</td>
        <td>
          <div class="action-buttons">
            <button class="edit-btn" onclick="editAdvance('${record.id}')">Edit</button>
            <button class="delete-btn" onclick="deleteAdvance('${record.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  });
}
function deleteAdvance(id) {
  if (!confirm("Delete this advance record?")) return;

  advanceRecords = advanceRecords.filter((record) => String(record.id) !== String(id));
  setLocalUpdatedAt(Date.now());
  saveAll();
  renderAll();
}

function editLedger(id) {
  const record = ledgerRecords.find((item) => String(item.id) === String(id));
  if (!record) return;

  openPage("ledger", document.querySelector("button[onclick*='ledger']"));

  document.getElementById("ledgerDate").value = record.date;
  document.getElementById("ledgerDescription").value = record.description;
  document.getElementById("ledgerType").value = record.type;
  document.getElementById("ledgerAmount").value = record.amount;

  editingRecord.ledger = record.id;
  document.getElementById("ledgerSubmitBtn").textContent = "Update Entry";
}

function editSale(id) {
  const record = salesRecords.find((item) => String(item.id) === String(id));
  if (!record) return;

  openPage("sales", document.querySelector("button[onclick*='sales']"));

  document.getElementById("salesDate").value = record.date;
  document.getElementById("salesDescription").value = record.description;
  document.getElementById("salesInvoice").value = record.invoice || "";
  document.getElementById("salesQuantity").value = record.quantity || "";
  document.getElementById("salesPrice").value = record.price || "";
  document.getElementById("salesAmount").value = Number(record.amount || (record.quantity * record.price) || 0).toFixed(2);
  document.getElementById("salesAmountPaid").value = Number(record.amountPaid || 0).toFixed(2);
  document.getElementById("salesPaidBy").value = record.paidBy || "";
  document.getElementById("salesBalanceRemaining").value = Number(record.balanceRemaining ?? (Number(record.amount || 0) - Number(record.amountPaid || 0))).toFixed(2);

  editingRecord.sales = record.id;
  document.getElementById("salesSubmitBtn").textContent = "Update Sale";
  const cancelBtn = document.getElementById("salesCancelBtn");
  if (cancelBtn) cancelBtn.style.display = '';
}

function editPurchase(id) {
  const record = purchaseRecords.find((item) => String(item.id) === String(id));
  if (!record) return;

  openPage("purchases", document.querySelector("button[onclick*='purchases']"));

  document.getElementById("purchaseDate").value = record.date;
  document.getElementById("purchaseType").value = record.type || "Other";
  document.getElementById("purchaseDescription").value = record.description;
  document.getElementById("purchaseReceipt").value = record.receipt || "";
  document.getElementById("purchaseBoughtBy").value = record.boughtBy || "";
  document.getElementById("purchaseQuantity").value = record.quantity;
  document.getElementById("purchasePrice").value = record.price;
  document.getElementById("purchaseAmount").value = record.amount;
  document.getElementById("purchaseAmountPaid").value = Number(record.amountPaid || 0).toFixed(2);
  document.getElementById("purchaseBalanceRemaining").value = Number(record.balanceRemaining ?? (Number(record.amount || 0) - Number(record.amountPaid || 0))).toFixed(2);

  editingRecord.purchase = record.id;
  document.getElementById("purchaseSubmitBtn").textContent = "Update Purchase";
}

function editCostSale(id) {
  const record = costSalesRecords.find((item) => String(item.id) === String(id));
  if (!record) return;

  openPage("costSales", document.querySelector("button[onclick*='costSales']"));

  document.getElementById("costSalesDate").value = record.date;
  document.getElementById("costSalesDescription").value = record.description;
  document.getElementById("costSalesReference").value = record.reference || "";
  document.getElementById("costSalesQuantity").value = record.quantity;
  document.getElementById("costSalesPrice").value = record.price;
  document.getElementById("costSalesAmount").value = record.amount;

  editingRecord.costSales = record.id;
  document.getElementById("costSalesSubmitBtn").textContent = "Update Cost";
}
function editAdvance(id) {
  const record = advanceRecords.find((item) => String(item.id) === String(id));
  if (!record) return;

  openPage("advance", document.querySelector("button[onclick*='advance']"));

  const amountReceived =
    Number(record.amountReceived || 0) ||
    Number(record.estimatedPrice || 0) * Number(record.estimatedKg || 0);

  const amountRecovered =
    Number(record.amountRecovered || 0) ||
    Number(record.netWeight || 0) * Number(record.price || 0);

  const excessDelivery =
    Number(record.excessDelivery || 0) ||
    amountReceived - amountRecovered;

  document.getElementById("advanceDate").value = record.advanceDate || "";
  document.getElementById("advancePerson").value = record.person || "";
  document.getElementById("advancePaymentMode").value = record.paymentMode || "";
  document.getElementById("advanceEstimatedPrice").value = record.estimatedPrice || "";
  document.getElementById("advanceEstimatedKg").value = record.estimatedKg || "";
  document.getElementById("advanceAmountReceived").value = amountReceived.toFixed(2);

  document.getElementById("advanceRecoveryDate").value = record.recoveryDate || "";
  document.getElementById("advanceRecoveryType").value = record.recoveryType || "";
  document.getElementById("advanceGrossWeight").value = record.grossWeight || "";
  document.getElementById("advanceNetWeight").value = record.netWeight || "";
  document.getElementById("advancePrice").value = record.price || "";
  document.getElementById("advanceAmountRecovered").value = amountRecovered.toFixed(2);
  document.getElementById("advanceExcessDelivery").value = excessDelivery.toFixed(2);

  editingRecord.advance = record.id;
  document.getElementById("advanceSubmitBtn").textContent = "Update Advance";
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
    const grossProfit = - data.costSales - data.purchases + data.sales;

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
    const grossProfit = - data.costSales - data.purchases + data.sales;
    csv += `${formatMonthKey(month)},${data.sales},${data.purchases},${data.costSales},${grossProfit}\n`;
  });

  return csv;
}

async function downloadAllCSV() {
  if (!hasAnyRecord()) {
    alert("No records available for download.");
    return;
  }

  downloadFile(generateFullCSV(), `jasa_ventures_full_backup_${formatDateForFile()}.csv`, "text/csv");
}

async function downloadStyledExcelBackup() {
  if (!hasAnyRecord()) {
    alert("No records available for download.");
    return;
  }

  if (typeof ExcelJS === "undefined") {
    alert("ExcelJS library is missing. Please make sure libs/exceljs.min.js is added and linked in index.html.");
    return;
  }

  const staffName = prompt("Enter staff name for the Excel report:", "Your Name") || "Your Name";

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Jasa Ventures";
  workbook.lastModifiedBy = staffName;
  workbook.created = new Date();
  workbook.modified = new Date();

  workbook.properties.date1904 = false;

  const totals = getTotals();

  createSummarySheet(workbook, staffName, totals);
  createLedgerSheet(workbook);
  createSalesSheet(workbook);
  createPurchaseSheet(workbook);
  createCostSalesSheet(workbook);
  createAdvanceSheet(workbook);
  createMonthlySheet(workbook);

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `jasa_ventures_styled_backup_${formatDateForFile(new Date())}.xlsx`;
  link.click();

  URL.revokeObjectURL(url);
}

function createSummarySheet(workbook, staffName, totals) {
  const sheet = workbook.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 4 }]
  });

  sheet.columns = [
    { header: "Item", key: "item", width: 32 },
    { header: "Value", key: "value", width: 28 }
  ];

  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = "JASA VENTURES BUSINESS BACKUP REPORT";
  sheet.getCell("A1").font = {
    name: "Calibri",
    size: 18,
    bold: true,
    color: { argb: "FFFFFFFF" }
  };
  sheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle"
  };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF243865" }
  };

  sheet.getRow(1).height = 32;

  sheet.addRow([]);
  sheet.addRow(["Staff Name", staffName]);
  sheet.addRow(["Generated On", formatDateTimeForReport(new Date())]);
  sheet.addRow(["Date Format", "DD/MM/YYYY"]);
  sheet.addRow(["Gross Profit Formula", "Sales - (Purchases + Cost of Sales)"]);
  sheet.addRow([]);
  sheet.addRow(["Total Sales", Number(totals.sales || 0)]);
  sheet.addRow(["Total Purchases", Number(totals.purchases || 0)]);
  sheet.addRow(["Total Cost of Sales", Number(totals.costSales || 0)]);
  sheet.addRow(["Gross Profit", Number(totals.grossProfit || 0)]);
  sheet.addRow(["Total Advances", Number(totals.advances || 0)]);
  sheet.addRow(["Ledger Credit", Number(totals.credit || 0)]);
  sheet.addRow(["Ledger Debit", Number(totals.debit || 0)]);
  sheet.addRow(["Ledger Balance", Number(totals.balance || 0)]);
  sheet.addRow(["Total Records", Number(totals.records || 0)]);

  styleReportSheet(sheet, {
    titleRows: [1],
    headerRow: null,
    moneyColumns: ["B"]
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 7) {
      row.getCell(2).numFmt = "#,##0.00";
    }
  });
}

function createLedgerSheet(workbook) {
  const sheet = workbook.addWorksheet("Ledger", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.columns = [
    { header: "#", key: "index", width: 8 },
    { header: "Date", key: "date", width: 16 },
    { header: "Description", key: "description", width: 36 },
    { header: "Credit", key: "credit", width: 16 },
    { header: "Debit", key: "debit", width: 16 },
    { header: "Balance", key: "balance", width: 16 }
  ];

  let balance = 0;

  ledgerRecords.forEach((record, index) => {
    let credit = null;
    let debit = null;

    if (record.type === "credit") {
      credit = Number(record.amount);
      balance += Number(record.amount);
    } else {
      debit = Number(record.amount);
      balance -= Number(record.amount);
    }

    sheet.addRow({
      index: index + 1,
      date: formatDate(record.date),
      description: record.description,
      credit,
      debit,
      balance
    });
  });

  styleReportSheet(sheet, {
    headerRow: 1,
    moneyColumns: ["D", "E", "F"]
  });
}

function createSalesSheet(workbook) {
  const sheet = workbook.addWorksheet("Sales", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.columns = [
    { header: "#", key: "index", width: 8 },
    { header: "Date", key: "date", width: 16 },
    { header: "Description", key: "description", width: 36 },
    { header: "Invoice No.", key: "invoice", width: 18 },
    { header: "Amount", key: "amount", width: 16 },
    { header: "Month", key: "month", width: 20 }
  ];

  salesRecords.forEach((record, index) => {
    sheet.addRow({
      index: index + 1,
      date: formatDate(record.date),
      description: record.description,
      invoice: record.invoice || "-",
      amount: Number(record.amount),
      month: getMonthName(record.date)
    });
  });

  styleReportSheet(sheet, {
    headerRow: 1,
    moneyColumns: ["E"]
  });
}

function createPurchaseSheet(workbook) {
  const sheet = workbook.addWorksheet("Purchases", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.columns = [
    { header: "#", key: "index", width: 8 },
    { header: "Date", key: "date", width: 16 },
    { header: "Type", key: "type", width: 18 },
    { header: "Description", key: "description", width: 36 },
    { header: "Receipt No.", key: "receipt", width: 18 },
    { header: "Quantity", key: "quantity", width: 14 },
    { header: "Price", key: "price", width: 16 },
    { header: "Amount", key: "amount", width: 16 },
    { header: "Month", key: "month", width: 20 }
  ];

  purchaseRecords.forEach((record, index) => {
    sheet.addRow({
      index: index + 1,
      date: formatDate(record.date),
      type: record.type || "Other",
      description: record.description,
      receipt: record.receipt || "-",
      quantity: Number(record.quantity),
      price: Number(record.price),
      amount: Number(record.amount),
      month: getMonthName(record.date)
    });
  });

  styleReportSheet(sheet, {
    headerRow: 1,
    moneyColumns: ["G", "H"],
    numberColumns: ["F"]
  });
}

function createCostSalesSheet(workbook) {
  const sheet = workbook.addWorksheet("Cost of Sales", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.columns = [
    { header: "#", key: "index", width: 8 },
    { header: "Date", key: "date", width: 16 },
    { header: "Description", key: "description", width: 36 },
    { header: "Reference No.", key: "reference", width: 18 },
    { header: "Quantity", key: "quantity", width: 14 },
    { header: "Price", key: "price", width: 16 },
    { header: "Amount", key: "amount", width: 16 },
    { header: "Month", key: "month", width: 20 }
  ];

  costSalesRecords.forEach((record, index) => {
    sheet.addRow({
      index: index + 1,
      date: formatDate(record.date),
      description: record.description,
      reference: record.reference || "-",
      quantity: Number(record.quantity),
      price: Number(record.price),
      amount: Number(record.amount),
      month: getMonthName(record.date)
    });
  });

  styleReportSheet(sheet, {
    headerRow: 1,
    moneyColumns: ["F", "G"],
    numberColumns: ["E"]
  });
}

function createAdvanceSheet(workbook) {
  const sheet = workbook.addWorksheet("Advance", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.columns = [
    { header: "#", key: "index", width: 8 },
    { header: "Advance Date", key: "advanceDate", width: 16 },
    { header: "Person", key: "person", width: 24 },
    { header: "Payment Mode", key: "paymentMode", width: 18 },
    { header: "Estimated Price", key: "estimatedPrice", width: 18 },
    { header: "Estimated Kg", key: "estimatedKg", width: 16 },
    { header: "Recovery Date", key: "recoveryDate", width: 16 },
    { header: "Recovery Type", key: "recoveryType", width: 20 },
    { header: "Gross Weight", key: "grossWeight", width: 16 },
    { header: "Net Weight", key: "netWeight", width: 16 },
    { header: "Price", key: "price", width: 16 },
    { header: "Amount", key: "amount", width: 16 },
    { header: "Excess Delivery", key: "excessDelivery", width: 18 }
  ];

  advanceRecords.forEach((record, index) => {
    sheet.addRow({
      index: index + 1,
      advanceDate: formatDate(record.advanceDate),
      person: record.person,
      paymentMode: record.paymentMode,
      estimatedPrice: Number(record.estimatedPrice),
      estimatedKg: Number(record.estimatedKg),
      recoveryDate: formatDate(record.recoveryDate),
      recoveryType: record.recoveryType,
      grossWeight: Number(record.grossWeight),
      netWeight: Number(record.netWeight),
      price: Number(record.price),
      amount: Number(record.amount),
      excessDelivery: Number(record.excessDelivery)
    });
  });

  styleReportSheet(sheet, {
    headerRow: 1,
    moneyColumns: ["E", "K", "L"],
    numberColumns: ["F", "I", "J", "M"]
  });
}

function createMonthlySheet(workbook) {
  const sheet = workbook.addWorksheet("Monthly Summary", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.columns = [
    { header: "Month", key: "month", width: 22 },
    { header: "Sales", key: "sales", width: 18 },
    { header: "Purchases", key: "purchases", width: 18 },
    { header: "Cost of Sales", key: "costSales", width: 18 },
    { header: "Gross Profit", key: "grossProfit", width: 18 }
  ];

  const monthMap = buildMonthMap();

  Object.keys(monthMap).sort().forEach((month) => {
    const data = monthMap[month];
    const grossProfit = - Number(data.costSales) - Number(data.purchases) + Number(data.sales);

    sheet.addRow({
      month: formatMonthKey(month),
      sales: Number(data.sales),
      purchases: Number(data.purchases),
      costSales: Number(data.costSales),
      grossProfit
    });
  });

  styleReportSheet(sheet, {
    headerRow: 1,
    moneyColumns: ["B", "C", "D", "E"]
  });
}

function styleReportSheet(sheet, options = {}) {
  const headerRowNumber = options.headerRow || 1;
  const moneyColumns = options.moneyColumns || [];
  const numberColumns = options.numberColumns || [];

  sheet.properties.defaultRowHeight = 22;

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.font = {
        name: "Calibri",
        size: 11,
        color: { argb: "FF1F2937" }
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true
      };

      cell.border = {
        top: { style: "thin", color: { argb: "FFD9DEE8" } },
        left: { style: "thin", color: { argb: "FFD9DEE8" } },
        bottom: { style: "thin", color: { argb: "FFD9DEE8" } },
        right: { style: "thin", color: { argb: "FFD9DEE8" } }
      };

      if (rowNumber % 2 === 0 && rowNumber !== headerRowNumber) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FBFF" }
        };
      }
    });
  });

  const headerRow = sheet.getRow(headerRowNumber);

  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" }
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF243865" }
    };

    cell.border = {
      top: { style: "thin", color: { argb: "FF16223D" } },
      left: { style: "thin", color: { argb: "FF16223D" } },
      bottom: { style: "thin", color: { argb: "FF16223D" } },
      right: { style: "thin", color: { argb: "FF16223D" } }
    };
  });

  moneyColumns.forEach((columnLetter) => {
    sheet.getColumn(columnLetter).eachCell((cell, rowNumber) => {
      if (rowNumber !== headerRowNumber && typeof cell.value === "number") {
        cell.numFmt = "#,##0.00";
        cell.font = {
          name: "Calibri",
          size: 11,
          bold: true,
          color: { argb: "FF0F8A3A" }
        };
      }
    });
  });

  numberColumns.forEach((columnLetter) => {
    sheet.getColumn(columnLetter).eachCell((cell, rowNumber) => {
      if (rowNumber !== headerRowNumber && typeof cell.value === "number") {
        cell.numFmt = "#,##0.00";
      }
    });
  });

  sheet.autoFilter = {
    from: {
      row: headerRowNumber,
      column: 1
    },
    to: {
      row: headerRowNumber,
      column: sheet.columnCount
    }
  };
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




  await sendTabledTextToFormspree(
    staffName.trim(),
    recipientEmail,
    subject,
    tabledText,
    htmlReport,
    csv
  );

  openEmailApp(recipientEmail, subject, tabledText);

  alert("Backup text was sent. Gmail app is going to open for you to attach the PDF and CSV that you downloaded, and send the email");
}
async function sendTabledTextToFormspree(staffName, recipientEmail, subject, tabledText, htmlReport, csv) {
  if (!navigator.onLine) {
    alert("You are offline. Email app will open, but backup can't be received until you are online.");
    return;
  }

  const payload = {
    Business_name: "Jasa Ventures",
    Staff_name: staffName,
    Recipient_email: recipientEmail,
    Subject: subject,
    Backup_date: formatDateTimeForReport(new Date()),

    Message: tabledText,

    note: "CSV and PDF were downloaded from the app. Attach them manually in Gmail if needed."
  };


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
  downloadFile(json, `jasa_ventures_app_data_backup_${formatDateForFile()}.json`, "application/json");
}

function openPDFDownloadWindow(reportHTML) {
  const pdfWindow = window.open("", "_blank");

  pdfWindow.document.open();
  pdfWindow.document.write(reportHTML);
  pdfWindow.document.close();

  pdfWindow.onload = function () {
    pdfWindow.focus();
    pdfWindow.print();
  };
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

function triggerImportReplace() {
  const input = document.getElementById("importReplaceFile");
  if (!input) {
    alert("Import input not found.");
    return;
  }
  input.value = "";
  input.click();
}

function importAndReplaceData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      if (!confirm("This will replace ALL current app data with the backup file. Proceed?")) return;

      ledgerRecords = Array.isArray(data.ledgerRecords) ? data.ledgerRecords : [];
      salesRecords = Array.isArray(data.salesRecords) ? data.salesRecords : [];
      purchaseRecords = Array.isArray(data.purchaseRecords) ? data.purchaseRecords : [];
      costSalesRecords = Array.isArray(data.costSalesRecords) ? data.costSalesRecords : [];
      advanceRecords = Array.isArray(data.advanceRecords) ? data.advanceRecords : [];

      saveAll();
      renderAll();
      alert("Data imported and replaced successfully.");
    } catch (err) {
      alert("Invalid backup file. Please upload a valid Jasa Ventures JSON backup.");
      console.error(err);
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

async function exportThenClearData() {
  if (!hasAnyRecord()) {
    alert("No records to clear.");
    return;
  }

  // 1️⃣ Export 
  await  exportJSONBackup();           // download


  // Optional: you can also generate PDF if needed
  // await printStyledPDF();

  // 2️⃣ Clear all records
  salesRecords = [];
  purchaseRecords = [];
  costSalesRecords = [];
  advanceRecords = [];
  ledgerRecords = [];

  saveAll();       // Save cleared state to localStorage
  renderAll();     // Refresh all tables
  alert("All records shall be cleared after this backup!");
}

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
    color: #0c3063;
    margin: 24px;
    background: #d5ecc9;
  }

  .report-header {
    background: linear-gradient(90deg, #ffffff, #dbdbc6);
    color: #0b0c49;
    padding: 24px;
    border: 2px solid #053492;
    border-radius: 17px;
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
    border: 2px solid #04163b;
    background: #98bae4;
    padding: 14px;
    border-radius: 17px;
    border-left: 5px solid #e7ad4a;
  }

  .summary-box strong {
    display: block;
    color: #031133;
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
    font-size: 15px;
    border: 1px solid #0e1116;
  }

  th {
    background: #8da0ce;
    color: #071272;
    padding: 10px;
    border: 1px solid #16223d;
    text-align: center;
    font-weight: bold;
  }

  td {
    padding: 9px;
    border: 1px solid #080c14;
    text-align: center;
  }

  tr:nth-child(even) td {
    background: #c5bdac;
  }

  tr:nth-child(odd) td {
    background: #f1ecda;
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

  .report-footer {
    margin-top: 24px;
    padding: 16px;
    border-top: 2px solid #04163b;
    color: #071272;
    font-size: 14px;
    text-align: center;
    background: #eff4ff;
    border-radius: 10px;
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
    <p class="meta"><strong>Generated On:</strong> ${formatDateTimeForReport(new Date())}</p>
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
    Gross Profit Formula Used:  Sales - (Purchases + Cost of Sales)
  </div>

  ${buildHTMLSection("Ledger Records", ["#", "Date", "Description", "Credit", "Debit", "Balance"], getLedgerRows())}
  ${buildHTMLSection("Sales Records", ["#", "Date", "Description", "Invoice No.", "Amount", "Month"], getSalesRows())}
  ${buildHTMLSection("Purchase Records", ["#", "Date", "Type", "Description", "Receipt No.", "Quantity", "Price", "Amount", "Month"], getPurchaseRows())}
  ${buildHTMLSection("Cost of Sales Records", ["#", "Date", "Description", "Reference No.", "Quantity", "Price", "Amount", "Month"], getCostSalesRows())}
  ${buildHTMLSection("Advance Records", ["#", "Advance Date", "Person", "Payment Mode", "Estimated Price", "Estimated Kg", "Recovery Date", "Recovery Type", "Gross Weight", "Net Weight", "Price", "Amount", "Excess Delivery"], getAdvanceRows())}
  ${buildHTMLSection("Monthly Summary", ["Month", "Sales", "Purchases", "Cost of Sales", "Gross Profit"], getMonthlyRows())}

  <div class="report-footer">
        <div><strong>Report generated by:</strong> Jasa Ventures app</div>
        <div><strong>App Developed by:</strong> ${escapeHTML(DEVELOPER_NAME)}</div>
        <div><strong>Contact:</strong> ${escapeHTML(DEVELOPER_CONTACT)}</div>

  </div>
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
Generated On: ${formatDateTimeForReport(new Date())}
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
Sales - (Purchases + Cost of Sales)

${buildTextSection("LEDGER RECORDS", ["#", "Date", "Description", "Credit", "Debit", "Balance"], getLedgerTextRows())}

${buildTextSection("SALES RECORDS", ["#", "Date", "Description", "Invoice", "Amount", "Month"], getSalesTextRows())}

${buildTextSection("PURCHASE RECORDS", ["#", "Date", "Type", "Description", "Receipt", "Qty", "Price", "Amount", "Month"], getPurchaseTextRows())}

${buildTextSection("COST OF SALES RECORDS", ["#", "Date", "Description", "Reference", "Qty", "Price", "Amount", "Month"], getCostSalesTextRows())}

${buildTextSection("ADVANCE RECORDS", ["#", "Advance Date", "Person", "Mode", "Est Price", "Est Kg", "Recovery Date", "Recovery Type", "Gross", "Net", "Price", "Amount", "Excess"], getAdvanceTextRows())}

${buildTextSection("MONTHLY SUMMARY", ["Month", "Sales", "Purchases", "Cost of Sales", "Gross Profit"], getMonthlyTextRows())}

NOTE:
CSV,  and PDF-style report files have been downloaded from the app.
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
    const grossProfit = - data.costSales - data.purchases + data.sales;

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

function saveAll(options = {}) {
  const markDirty = options.markDirty ?? !syncBooting;
  const schedule = options.schedule ?? !syncBooting;

  localStorage.setItem("jasa_ledger_records", JSON.stringify(ledgerRecords));
  localStorage.setItem("jasa_sales_records", JSON.stringify(salesRecords));
  localStorage.setItem("jasa_purchase_records", JSON.stringify(purchaseRecords));
  localStorage.setItem("jasa_cost_sales_records", JSON.stringify(costSalesRecords));
  localStorage.setItem("jasa_advance_records", JSON.stringify(advanceRecords));

  if (markDirty) {
    localStorage.setItem("jasa_last_modified", String(Date.now()));
  }

  if (schedule && navigator.onLine) {
    queueSupabaseSync();
  }
}

function renderAll() {
  renderLedger();
  renderSales();
  renderPurchases();
  renderCostSales();
  renderAdvances();
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
  const grossProfit = - costSales - purchases + sales;

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

function formatDateForFile(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}${mm}${yyyy}_${hh}${min}${ss}`;
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
   SUPABASE 2-WAY SYNC
   Pull first -> Merge -> Save Local -> Push Back
========================= */

function getLocalBundle() {
  return {
    ledgerRecords,
    salesRecords,
    purchaseRecords,
    costSalesRecords,
    advanceRecords
  };
}

function hasAnyRecord(bundle = getLocalBundle()) {
  return (
    (bundle.ledgerRecords || []).length > 0 ||
    (bundle.salesRecords || []).length > 0 ||
    (bundle.purchaseRecords || []).length > 0 ||
    (bundle.costSalesRecords || []).length > 0 ||
    (bundle.advanceRecords || []).length > 0
  );
}

function getLocalUpdatedAt() {
  return Number(localStorage.getItem("jasa_last_modified") || 0);
}

function setLocalUpdatedAt(value) {
  localStorage.setItem("jasa_last_modified", String(value || Date.now()));
}

function normalizeRecord(record, fallbackTime) {
  return {
    ...record,
    _updatedAt: Number(record._updatedAt || fallbackTime || Date.now())
  };
}

function mergeRecordArrays(localArray = [], remoteArray = [], localTime = 0, remoteTime = 0) {
  const mergedMap = new Map();

  remoteArray.forEach((record) => {
    const cleanRecord = normalizeRecord(record, remoteTime);
    mergedMap.set(String(cleanRecord.id), cleanRecord);
  });

  localArray.forEach((record) => {
    const cleanRecord = normalizeRecord(record, localTime);
    const existing = mergedMap.get(String(cleanRecord.id));

    if (!existing || Number(cleanRecord._updatedAt || 0) >= Number(existing._updatedAt || 0)) {
      mergedMap.set(String(cleanRecord.id), cleanRecord);
    }
  });

  return Array.from(mergedMap.values());
}

function mergeBundles(localBundle, remoteBundle, localTime, remoteTime) {
  return {
    ledgerRecords: mergeRecordArrays(
      localBundle.ledgerRecords,
      remoteBundle.ledgerRecords,
      localTime,
      remoteTime
    ),

    salesRecords: mergeRecordArrays(
      localBundle.salesRecords,
      remoteBundle.salesRecords,
      localTime,
      remoteTime
    ),

    purchaseRecords: mergeRecordArrays(
      localBundle.purchaseRecords,
      remoteBundle.purchaseRecords,
      localTime,
      remoteTime
    ),

    costSalesRecords: mergeRecordArrays(
      localBundle.costSalesRecords,
      remoteBundle.costSalesRecords,
      localTime,
      remoteTime
    ),

    advanceRecords: mergeRecordArrays(
      localBundle.advanceRecords,
      remoteBundle.advanceRecords,
      localTime,
      remoteTime
    )
  };
}

function applyBundleToLocal(bundle, updatedAt) {
  ledgerRecords = Array.isArray(bundle.ledgerRecords) ? bundle.ledgerRecords : [];
  salesRecords = Array.isArray(bundle.salesRecords) ? bundle.salesRecords : [];
  purchaseRecords = Array.isArray(bundle.purchaseRecords) ? bundle.purchaseRecords : [];
  costSalesRecords = Array.isArray(bundle.costSalesRecords) ? bundle.costSalesRecords : [];
  advanceRecords = Array.isArray(bundle.advanceRecords) ? bundle.advanceRecords : [];

  saveAll({ markDirty: false, schedule: false });
  setLocalUpdatedAt(updatedAt || Date.now());
  renderAll();
}

function setSyncStatus(message, type = "normal") {
  if (!syncStatus) return;

  syncStatus.textContent = message;

  if (type === "success") {
    syncStatus.style.color = "#0f8a3a";
  } else if (type === "error") {
    syncStatus.style.color = "#b42318";
  } else if (type === "warning") {
    syncStatus.style.color = "#9a6400";
  } else {
    syncStatus.style.color = "#555";
  }
}

function queueSupabaseSync(delay = 1500) {
  if (syncBooting || !navigator.onLine) return;

  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncWithSupabase();
  }, delay);
}

async function manualSyncToSupabase() {
  await syncWithSupabase({ manual: true });
}

window.manualSyncToSupabase = manualSyncToSupabase;

async function syncWithSupabase(options = {}) {
  const manual = options.manual || false;

  if (!supabaseClient) {
    setSyncStatus("Supabase not configured", "error");

    if (manual) {
      alert("Add your Supabase URL and anon key in script.js first.");
    }

    return;
  }

  if (!navigator.onLine) {
    setSyncStatus("Waiting for internet", "warning");

    if (manual) {
      alert("You are offline. Sync will run when internet is available.");
    }

    return;
  }

  if (syncInProgress) return;

  syncInProgress = true;
  if (syncBtn) syncBtn.disabled = true;
  setSyncStatus("Downloading from Supabase...", "normal");

  try {
    const localBundle = getLocalBundle();
    const localUpdatedAt = getLocalUpdatedAt();

    /*
      STEP 1: Always download from Supabase first
    */
    const { data: remoteRow, error: pullError } = await supabaseClient
      .from(SUPABASE_SYNC_TABLE)
      .select("sync_key,data,local_updated_at,synced_at")
      .eq("sync_key", SUPABASE_SYNC_KEY)
      .maybeSingle();

    if (pullError) throw pullError;

    const remoteBundle = remoteRow?.data || {
      ledgerRecords: [],
      salesRecords: [],
      purchaseRecords: [],
      costSalesRecords: [],
      advanceRecords: []
    };

    const remoteUpdatedAt = Number(remoteRow?.local_updated_at || 0);

    /*
      STEP 2: Merge local data and Supabase data
      This prevents a second phone from wiping cloud data.
    */
    let mergedBundle;
    let mergedUpdatedAt = Math.max(localUpdatedAt, remoteUpdatedAt, Date.now());

    if (localUpdatedAt > remoteUpdatedAt) {
      // Local device is newer, so push local changes to Supabase.
      // This allows delete and edit to stay deleted/edited.
      mergedBundle = localBundle;
      mergedUpdatedAt = localUpdatedAt;
    } else if (remoteUpdatedAt > localUpdatedAt) {
      // Supabase is newer, so use cloud data.
      mergedBundle = remoteBundle;
      mergedUpdatedAt = remoteUpdatedAt;
    } else {
      // Same timestamp or unclear, then merge safely.
      mergedBundle = mergeBundles(
        localBundle,
        remoteBundle,
        localUpdatedAt,
        remoteUpdatedAt
      );
    }

    /*
      If both sides have no data, do not upload anything.
    */
    if (!hasAnyRecord(mergedBundle)) {
      setSyncStatus("No records to sync", "normal");
      return;
    }

    /*
      STEP 3: Save merged data to this device first
      This is what makes the second device show the Supabase records.
    */
    setSyncStatus("Saving downloaded records...", "normal");
    applyBundleToLocal(mergedBundle, mergedUpdatedAt);

    /*
      STEP 4: Upload the merged result back to Supabase
      This completes the 2-way sync.
    */
    setSyncStatus("Uploading merged records...", "normal");

    const { error: pushError } = await supabaseClient
      .from(SUPABASE_SYNC_TABLE)
      .upsert(
        {
          sync_key: SUPABASE_SYNC_KEY,
          data: mergedBundle,
          local_updated_at: mergedUpdatedAt,
          synced_at: new Date().toISOString()
        },
        { onConflict: "sync_key" }
      );

    if (pushError) throw pushError;

    localStorage.setItem("jasa_last_synced", String(Date.now()));
    setSyncStatus("2-way sync complete", "success");
  } catch (error) {
    console.error("Supabase 2-way sync failed:", error);
    setSyncStatus("Sync failed", "error");

    if (manual) {
      alert("Sync failed: " + (error.message || "Unknown error"));
    }
  } finally {
    syncInProgress = false;
    if (syncBtn) syncBtn.disabled = !navigator.onLine || !supabaseClient;
  }
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

  if (syncBtn) {
    syncBtn.disabled = !navigator.onLine || !supabaseClient;
  }
} 

window.addEventListener("online", function () {
  updateOnlineStatus();
  queueSupabaseSync(300);
});

window.addEventListener("offline", function () {
  updateOnlineStatus();
  setSyncStatus("Waiting for internet", "warning");
});

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

function formatDateTimeForReport(dateObject) {
  const day = String(dateObject.getDate()).padStart(2, "0");
  const month = String(dateObject.getMonth() + 1).padStart(2, "0");
  const year = dateObject.getFullYear();

  const hours = String(dateObject.getHours()).padStart(2, "0");
  const minutes = String(dateObject.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}