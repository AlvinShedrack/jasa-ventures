/* ==========================================================================
   JASA VENTURES MANAGEMENT APPLICATION - COMPLETE SCRIPT (script.js)
   ========================================================================== */

// --- GLOBAL STATE & STORAGE KEYS ---
const STORAGE_KEYS = {
  USERS: "jasa_users",
  CURRENT_USER: "jasa_current_user",
  SALES: "jasa_sales",
  PURCHASES: "jasa_purchases"
};

let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [
  { username: "woniala@jasa.com", password: "woniala2026", role: "admin" },
  { username: "employee@jasa.com", password: "employee2026", role: "employee" }
];

let currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) || null;
let salesData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES)) || [];
let purchaseData = JSON.parse(localStorage.getItem(STORAGE_KEYS.PURCHASES)) || [];
let deferredPrompt = null;

// --- DOM & SANITIZATION HELPERS ---
function safeGet(id) {
  return document.getElementById(id);
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- PAGE NAVIGATION & TAB SWITCHING ---
function openPage(pageId, btnElement) {
  // Guard access to restricted views for non-admins
  if (currentUser && currentUser.role === "employee") {
    if (pageId === "dashboard" || pageId === "monthly") {
      alert("Access restricted to Administrators.");
      return;
    }
  }

  const pages = document.querySelectorAll(".page");
  pages.forEach((p) => p.classList.remove("active-page"));

  const targetPage = safeGet(pageId);
  if (targetPage) {
    targetPage.classList.add("active-page");
  }

  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach((btn) => btn.classList.remove("active"));
  if (btnElement) {
    btnElement.classList.add("active");
  }

  // Refresh dynamic UI views when navigating
  if (pageId === "dashboard") updateDashboard();
  if (pageId === "ledger") renderLedgerTable();
  if (pageId === "monthly") updateMonthlySummary();
}

// --- AUTHENTICATION & ROLE PERMISSIONS ---
function applyUserPermissions() {
  const loginScreen = safeGet("loginScreen");
  const userInfoDisplay = safeGet("userInfoDisplay");

  if (!currentUser) {
    if (loginScreen) loginScreen.style.display = "flex";
    return;
  }

  if (loginScreen) loginScreen.style.display = "none";
  if (userInfoDisplay) {
    userInfoDisplay.textContent = `User: ${currentUser.username} (${currentUser.role.toUpperCase()})`;
  }

  const tabDashboard = safeGet("tabDashboard");
  const tabMonthly = safeGet("tabMonthly");
  const manageUsersBtn = safeGet("manageUsersBtn");

  if (currentUser.role === "employee") {
    if (tabDashboard) tabDashboard.style.display = "none";
    if (tabMonthly) tabMonthly.style.display = "none";
    if (manageUsersBtn) manageUsersBtn.style.display = "none";

    const activePage = document.querySelector(".page.active-page");
    if (activePage && (activePage.id === "dashboard" || activePage.id === "monthly")) {
      openPage("ledger", safeGet("tabLedger"));
    }
  } else {
    if (tabDashboard) tabDashboard.style.display = "";
    if (tabMonthly) tabMonthly.style.display = "";
    if (manageUsersBtn) manageUsersBtn.style.display = "";
  }

  updateDashboard();
  renderLedgerTable();
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  location.reload();
}

// --- USER MANAGEMENT (ADMIN ONLY) ---
function openUserModal() {
  if (!currentUser || currentUser.role !== "admin") return;
  const modal = safeGet("userModal");
  if (!modal) return;
  renderUserList();
  modal.style.display = "flex";
}

function closeUserModal() {
  const modal = safeGet("userModal");
  if (modal) modal.style.display = "none";
}

function renderUserList() {
  const container = safeGet("userListContainer");
  if (!container) return;

  container.innerHTML = "";
  users.forEach((u) => {
    const isSystemAdmin = u.username === "woniala@jasa.com" || u.username === "admin@jasa.com";
    const deleteBtn = !isSystemAdmin
      ? `<button class="delete-btn" style="padding:2px 6px;font-size:11px;" onclick="deleteUser('${escapeHTML(u.username)}')">Delete</button>`
      : `<span style="font-size:11px;color:#888;">System</span>`;

    container.innerHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #eee;">
        <span><strong>${escapeHTML(u.username)}</strong> (${escapeHTML(u.role)})</span>
        ${deleteBtn}
      </div>
    `;
  });
}

function deleteUser(username) {
  if (!currentUser || currentUser.role !== "admin") return;
  if (username === "woniala@jasa.com" || username === "admin@jasa.com") {
    alert("Cannot delete primary system administrator.");
    return;
  }
  if (!confirm(`Remove user ${username}?`)) return;

  users = users.filter((u) => u.username !== username);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  renderUserList();
}

// --- DATA STORAGE OPERATIONS ---
function saveSalesData() {
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(salesData));
}

function savePurchaseData() {
  localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchaseData));
}

function deleteTransaction(type, id) {
  if (!currentUser || currentUser.role !== "admin") {
    alert("Only administrators can delete transactions.");
    return;
  }
  if (!confirm("Delete this ledger entry?")) return;

  if (type === "sale") {
    salesData = salesData.filter((item) => item.id !== id);
    saveSalesData();
  } else if (type === "purchase") {
    purchaseData = purchaseData.filter((item) => item.id !== id);
    savePurchaseData();
  }

  renderLedgerTable();
  updateDashboard();
}

// --- LEDGER, DASHBOARD & SUMMARY CALCULATIONS ---
function renderLedgerTable() {
  const tbody = safeGet("ledgerTableBody");
  if (!tbody) return;

  const combined = [
    ...salesData.map((s) => ({ ...s, txType: "Sale", classType: "text-success" })),
    ...purchaseData.map((p) => ({ ...p, txType: "Purchase", classType: "text-danger" }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (combined.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No records recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = combined
    .map((tx) => {
      const formattedAmount = Number(tx.amount || 0).toLocaleString();
      const canDelete = currentUser && currentUser.role === "admin";
      const deleteAction = canDelete
        ? `<button class="delete-btn" style="padding:2px 6px;font-size:11px;" onclick="deleteTransaction('${tx.txType.toLowerCase()}', ${tx.id})">Delete</button>`
        : "-";

      return `
        <tr>
          <td>${escapeHTML(tx.date)}</td>
          <td><span class="${tx.classType}"><strong>${tx.txType}</strong></span></td>
          <td>${escapeHTML(tx.item || tx.description || "N/A")}</td>
          <td>${tx.quantity || 1}</td>
          <td>${formattedAmount}</td>
          <td>${deleteAction}</td>
        </tr>
      `;
    })
    .join("");
}

function updateDashboard() {
  const totalSales = salesData.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalExpenses = purchaseData.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const netBalance = totalSales - totalExpenses;

  const salesEl = safeGet("dashTotalSales");
  const expenseEl = safeGet("dashTotalExpenses");
  const balanceEl = safeGet("dashNetBalance");

  if (salesEl) salesEl.textContent = `UGX ${totalSales.toLocaleString()}`;
  if (expenseEl) expenseEl.textContent = `UGX ${totalExpenses.toLocaleString()}`;
  if (balanceEl) {
    balanceEl.textContent = `UGX ${netBalance.toLocaleString()}`;
    balanceEl.style.color = netBalance >= 0 ? "#28a745" : "#dc3545";
  }
}

function updateMonthlySummary() {
  const container = safeGet("monthlySummaryContainer");
  if (!container) return;

  const monthlyMap = {};

  salesData.forEach((s) => {
    if (!s.date) return;
    const month = s.date.substring(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { sales: 0, purchases: 0 };
    monthlyMap[month].sales += Number(s.amount || 0);
  });

  purchaseData.forEach((p) => {
    if (!p.date) return;
    const month = p.date.substring(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { sales: 0, purchases: 0 };
    monthlyMap[month].purchases += Number(p.amount || 0);
  });

  const months = Object.keys(monthlyMap).sort().reverse();
  if (months.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>No monthly ledger history available.</p>";
    return;
  }

  container.innerHTML = `
    <table class="data-table" style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th>Month</th>
          <th>Sales (UGX)</th>
          <th>Expenses (UGX)</th>
          <th>Net Margin</th>
        </tr>
      </thead>
      <tbody>
        ${months
          .map((m) => {
            const s = monthlyMap[m].sales;
            const p = monthlyMap[m].purchases;
            const net = s - p;
            return `
              <tr>
                <td><strong>${m}</strong></td>
                <td style="color:#28a745;">${s.toLocaleString()}</td>
                <td style="color:#dc3545;">${p.toLocaleString()}</td>
                <td style="font-weight:bold; color:${net >= 0 ? "#28a745" : "#dc3545"};">${net.toLocaleString()}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

// --- DATA BACKUP & EXPORT ---
function exportLedgerData() {
  const backupPayload = {
    sales: salesData,
    purchases: purchaseData,
    users: currentUser?.role === "admin" ? users : undefined,
    exportDate: new Date().toISOString()
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `jasa_ledger_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// --- INITIALIZATION & FORM LISTENERS ---
function initApp() {
  // Login Form Submission
  const loginForm = safeGet("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const usernameInput = safeGet("loginUsername");
      const passwordInput = safeGet("loginPassword");

      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      const foundUser = users.find((u) => u.username === username && u.password === password);
      if (foundUser) {
        currentUser = foundUser;
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
        applyUserPermissions();
        this.reset();
      } else {
        alert("Invalid credentials.");
      }
    });
  }

  // Create New User Form
  const addUserForm = safeGet("addUserForm");
  if (addUserForm) {
    addUserForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!currentUser || currentUser.role !== "admin") return;

      const newUsername = safeGet("newUsername")?.value.trim();
      const newPassword = safeGet("newPassword")?.value;
      const newRole = safeGet("newUserRole")?.value || "employee";

      if (!newUsername || !newPassword) {
        alert("Username and password are required.");
        return;
      }

      if (users.some((u) => u.username === newUsername)) {
        alert("Username already exists.");
        return;
      }

      users.push({ username: newUsername, password: newPassword, role: newRole });
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      alert("User added successfully.");
      this.reset();
      renderUserList();
    });
  }

  // Sales Form Submission
  const salesForm = safeGet("salesForm");
  if (salesForm) {
    salesForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const item = safeGet("saleItem")?.value.trim();
      const qty = parseInt(safeGet("saleQty")?.value || "1", 10);
      const amount = parseFloat(safeGet("saleAmount")?.value || "0");
      const date = safeGet("saleDate")?.value || new Date().toISOString().slice(0, 10);

      if (!item || amount <= 0) {
        alert("Valid item name and amount are required.");
        return;
      }

      salesData.push({ id: Date.now(), item, quantity: qty, amount, date, user: currentUser?.username });
      saveSalesData();
      this.reset();
      alert("Sale entry recorded.");
      renderLedgerTable();
      updateDashboard();
    });
  }

  // Purchase Form Submission
  const purchaseForm = safeGet("purchaseForm");
  if (purchaseForm) {
    purchaseForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const item = safeGet("purchaseItem")?.value.trim();
      const amount = parseFloat(safeGet("purchaseAmount")?.value || "0");
      const date = safeGet("purchaseDate")?.value || new Date().toISOString().slice(0, 10);

      if (!item || amount <= 0) {
        alert("Valid purchase details required.");
        return;
      }

      purchaseData.push({ id: Date.now(), item, quantity: 1, amount, date, user: currentUser?.username });
      savePurchaseData();
      this.reset();
      alert("Purchase entry recorded.");
      renderLedgerTable();
      updateDashboard();
    });
  }

  // Initial Security & Data Sync
  applyUserPermissions();
}

// --- PWA SERVICE WORKER & INSTALL PROMPT ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("ServiceWorker registration failed:", err);
    });
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const pwaBtn = safeGet("pwaInstallBtn");
  if (pwaBtn) pwaBtn.style.display = "block";
});

function triggerPWAInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choice) => {
    if (choice.outcome === "accepted") {
      const pwaBtn = safeGet("pwaInstallBtn");
      if (pwaBtn) pwaBtn.style.display = "none";
    }
    deferredPrompt = null;
  });
}

// Execution initialization guard
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
