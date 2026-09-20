const DEMO_TODAY = "2026-09-20";

const accounts = [
  { id: "revolut", name: "Revolut", masked: "••4821", type: "Digital cash account", openingBalance: 820, status: "Connected", updated: "2 min ago", logo: "R", className: "" },
  { id: "nordea", name: "Nordea", masked: "••1092", type: "Debit account", openingBalance: 1680, status: "Connected", updated: "12 min ago", logo: "N", className: "nordea" },
  { id: "cash", name: "Cash", masked: "Manual", type: "Manual account", openingBalance: 120, status: "Manual", updated: "18 Sep", logo: "€", className: "cash" }
];

const categories = {
  income: { name: "Income", icon: "↙" },
  housing: { name: "Housing", icon: "⌂" },
  groceries: { name: "Groceries", icon: "◒" },
  food: { name: "Food & drink", icon: "☕" },
  transport: { name: "Transport", icon: "↔" },
  health: { name: "Health", icon: "+" },
  fitness: { name: "Fitness", icon: "◆" },
  shopping: { name: "Shopping", icon: "◇" },
  entertainment: { name: "Entertainment", icon: "▷" },
  education: { name: "Education", icon: "▤" }
};

const transactions = [
  { id:"salary", date:"2026-09-01", amount:1200, direction:"income", merchant:"Aalto project stipend", category:"income", account:"nordea", status:"confirmed", confidence:"high", channel:"notification", tags:["stipend"] },
  { id:"rent", date:"2026-09-02", amount:650, direction:"expense", merchant:"Student housing", category:"housing", account:"nordea", status:"confirmed", confidence:"high", channel:"email", tags:["rent"] },
  { id:"groceries1", date:"2026-09-03", amount:65.50, direction:"expense", merchant:"K-Market Otaniemi", category:"groceries", account:"revolut", status:"confirmed", confidence:"high", channel:"notification", tags:["food","essentials"] },
  { id:"hslMonth", date:"2026-09-04", amount:31.50, direction:"expense", merchant:"HSL monthly ticket", category:"transport", account:"revolut", status:"confirmed", confidence:"high", channel:"email", tags:["travel"] },
  { id:"coffee1", date:"2026-09-05", amount:4.80, direction:"expense", merchant:"Kaffa Roastery", category:"food", account:"cash", status:"confirmed", confidence:"high", channel:"manual", tags:["coffee"] },
  { id:"museum", date:"2026-09-06", amount:18, direction:"expense", merchant:"Amos Rex", category:"entertainment", account:"revolut", status:"confirmed", confidence:"high", channel:"notification", tags:["culture"] },
  { id:"freelance1", date:"2026-09-07", amount:300, direction:"income", merchant:"Freelance design", category:"income", account:"revolut", status:"confirmed", confidence:"high", channel:"email", tags:["work"] },
  { id:"univafe1", date:"2026-09-08", amount:3.10, direction:"expense", merchant:"UniCafe", category:"food", account:"revolut", status:"confirmed", confidence:"high", channel:"notification", tags:["lunch"] },
  { id:"pharmacy", date:"2026-09-09", amount:22, direction:"expense", merchant:"Yliopiston Apteekki", category:"health", account:"nordea", status:"confirmed", confidence:"high", channel:"notification", tags:["health"] },
  { id:"gym", date:"2026-09-10", amount:39, direction:"expense", merchant:"UniSport", category:"fitness", account:"nordea", status:"confirmed", confidence:"high", channel:"email", tags:["gym"] },
  { id:"groceries2", date:"2026-09-11", amount:54.60, direction:"expense", merchant:"K-Supermarket", category:"groceries", account:"revolut", status:"confirmed", confidence:"high", channel:"notification", tags:["food","essentials"] },
  { id:"books", date:"2026-09-12", amount:42.50, direction:"expense", merchant:"Academic Bookstore", category:"education", account:"revolut", status:"confirmed", confidence:"high", channel:"email", tags:["books"] },
  { id:"lunch2", date:"2026-09-13", amount:12.80, direction:"expense", merchant:"Sandro", category:"food", account:"cash", status:"confirmed", confidence:"high", channel:"manual", tags:["lunch"] },
  { id:"freelance2", date:"2026-09-14", amount:250, direction:"income", merchant:"Content project", category:"income", account:"revolut", status:"confirmed", confidence:"high", channel:"email", tags:["work"] },
  { id:"coffee2", date:"2026-09-14", amount:5.20, direction:"expense", merchant:"Robert's Coffee", category:"food", account:"revolut", status:"confirmed", confidence:"high", channel:"notification", tags:["coffee"] },
  { id:"groceries3", date:"2026-09-15", amount:72, direction:"expense", merchant:"Prisma", category:"groceries", account:"nordea", status:"confirmed", confidence:"high", channel:"notification", tags:["food","essentials"] },
  { id:"netflix", date:"2026-09-15", amount:15.99, direction:"expense", merchant:"Netflix", category:"entertainment", account:"revolut", status:"confirmed", confidence:"high", channel:"email", tags:["subscription"] },
  { id:"hslSingle", date:"2026-09-16", amount:3.10, direction:"expense", merchant:"HSL ticket", category:"transport", account:"revolut", status:"confirmed", confidence:"high", channel:"notification", tags:["travel"] },
  { id:"zara", date:"2026-09-17", amount:145, direction:"expense", merchant:"Zara", category:"shopping", account:"nordea", status:"pending", confidence:"medium", channel:"notification", tags:["clothes"] },
  { id:"coffee3", date:"2026-09-17", amount:6.40, direction:"expense", merchant:"Kaffa Roastery", category:"food", account:"revolut", status:"confirmed", confidence:"high", channel:"notification", tags:["coffee"] },
  { id:"restaurantPending", date:"2026-09-18", amount:31, direction:"expense", merchant:"Green Hippo", category:"food", account:"revolut", status:"pending", confidence:"medium", channel:"email + notification", tags:["dinner"], possibleDuplicateOf:"dinnerConfirmed" },
  { id:"dinnerConfirmed", date:"2026-09-18", amount:28, direction:"expense", merchant:"Green Hippo", category:"food", account:"nordea", status:"confirmed", confidence:"high", channel:"notification", tags:["dinner"] },
  { id:"stipend2", date:"2026-09-19", amount:320, direction:"income", merchant:"Part-time work", category:"income", account:"nordea", status:"confirmed", confidence:"high", channel:"notification", tags:["work"] },
  { id:"spotify", date:"2026-09-19", amount:11.99, direction:"expense", merchant:"Spotify", category:"entertainment", account:"revolut", status:"confirmed", confidence:"high", channel:"email", tags:["subscription"] },
  { id:"dinnerCash", date:"2026-09-20", amount:23.50, direction:"expense", merchant:"Fat Lizard", category:"food", account:"cash", status:"pending", confidence:"low", channel:"manual", tags:["dinner"] },
  { id:"coffee4", date:"2026-09-20", amount:4.90, direction:"expense", merchant:"Kaffa Roastery", category:"food", account:"revolut", status:"confirmed", confidence:"high", channel:"notification", tags:["coffee"] },
  { id:"augSalary", date:"2026-08-02", amount:900, direction:"income", merchant:"Summer project", category:"income", account:"nordea", status:"confirmed", confidence:"high", channel:"email", tags:["work"] },
  { id:"augRent", date:"2026-08-03", amount:650, direction:"expense", merchant:"Student housing", category:"housing", account:"nordea", status:"confirmed", confidence:"high", channel:"email", tags:["rent"] },
  { id:"augFood", date:"2026-08-17", amount:58, direction:"expense", merchant:"K-Supermarket", category:"groceries", account:"revolut", status:"confirmed", confidence:"high", channel:"notification", tags:["food"] }
];

const state = { view:"home", period:"month", account:"all", historyStatus:"all", query:"" };

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat("en-IE", { style:"currency", currency:"EUR" }).format(value);
const signedMoney = value => `${value >= 0 ? "+" : "−"}${money(Math.abs(value))}`;
const accountById = id => accounts.find(account => account.id === id);
const categoryById = id => categories[id] || { name:"Other", icon:"•" };

function periodConfig() {
  if (state.period === "week") {
    return {
      start:"2026-09-14", end:"2026-09-20", label:"14–20 Sep", shortLabel:"This week",
      buckets:[
        { label:"Mon", start:"2026-09-14", end:"2026-09-14" }, { label:"Tue", start:"2026-09-15", end:"2026-09-15" },
        { label:"Wed", start:"2026-09-16", end:"2026-09-16" }, { label:"Thu", start:"2026-09-17", end:"2026-09-17" },
        { label:"Fri", start:"2026-09-18", end:"2026-09-18" }, { label:"Sat", start:"2026-09-19", end:"2026-09-19" },
        { label:"Sun", start:"2026-09-20", end:"2026-09-20" }
      ]
    };
  }
  return {
    start:"2026-09-01", end:"2026-09-30", label:"September", shortLabel:"This month",
    buckets:[
      { label:"1–6", start:"2026-09-01", end:"2026-09-06" }, { label:"7–13", start:"2026-09-07", end:"2026-09-13" },
      { label:"14–20", start:"2026-09-14", end:"2026-09-20" }, { label:"21–27", start:"2026-09-21", end:"2026-09-27" },
      { label:"28–30", start:"2026-09-28", end:"2026-09-30" }
    ]
  };
}

function inRange(date, start, end) { return date >= start && date <= end; }
function accountScoped(items) { return state.account === "all" ? items : items.filter(item => item.account === state.account); }
function periodTransactions() { const p = periodConfig(); return accountScoped(transactions).filter(item => inRange(item.date, p.start, p.end) && item.status !== "excluded"); }
function confirmed(items = periodTransactions()) { return items.filter(item => item.status === "confirmed"); }
function pending(items = periodTransactions()) { return items.filter(item => item.status === "pending"); }
function amountTotal(items, direction) { return items.filter(item => item.direction === direction).reduce((sum, item) => sum + item.amount, 0); }

function trackedBalance(accountId = state.account) {
  const included = accountId === "all" ? accounts : accounts.filter(account => account.id === accountId);
  return included.reduce((total, account) => {
    const movements = transactions.filter(item => item.account === account.id && item.status === "confirmed" && item.date >= "2026-09-01" && item.date <= DEMO_TODAY)
      .reduce((sum, item) => sum + (item.direction === "income" ? item.amount : -item.amount), 0);
    return total + account.openingBalance + movements;
  }, 0);
}

function renderSourceFilter() {
  $("#sourceFilter").innerHTML = `<option value="all">All sources</option>${accounts.map(account => `<option value="${account.id}">${account.name}</option>`).join("")}`;
  $("#sourceFilter").value = state.account;
}

function renderChart() {
  const config = periodConfig();
  const items = confirmed();
  const values = config.buckets.map(bucket => {
    const bucketItems = items.filter(item => inRange(item.date, bucket.start, bucket.end));
    return { label:bucket.label, income:amountTotal(bucketItems,"income"), expense:amountTotal(bucketItems,"expense") };
  });
  const max = Math.max(1, ...values.flatMap(bucket => [bucket.income, bucket.expense]));
  $("#cashflowChart").style.setProperty("--buckets", values.length);
  $("#cashflowChart").innerHTML = values.map(bucket => {
    const incomeHeight = bucket.income ? Math.max(5, bucket.income / max * 100) : 2;
    const expenseHeight = bucket.expense ? Math.max(5, bucket.expense / max * 100) : 2;
    return `<div class="chart-bucket"><div class="bar-zone"><i class="flow-bar income" style="--income:${incomeHeight}%" data-value="${money(bucket.income)}" title="${bucket.label}: income ${money(bucket.income)}"></i><i class="flow-bar expense" style="--expense:${expenseHeight}%" data-value="${money(bucket.expense)}" title="${bucket.label}: spending ${money(bucket.expense)}"></i></div><span class="bucket-label">${bucket.label}</span></div>`;
  }).join("");
  $("#chartPeriodLabel").textContent = `${config.label} by ${state.period === "week" ? "day" : "week"} · confirmed records`;
}

function renderSummary() {
  const config = periodConfig();
  const items = confirmed();
  const income = amountTotal(items,"income");
  const expenses = amountTotal(items,"expense");
  const net = income - expenses;
  const pendingItems = pending();
  $("#availableBalance").textContent = money(trackedBalance());
  $("#balanceContext").textContent = state.account === "all" ? "Across all included accounts" : `${accountById(state.account).name} · tracked and confirmed`;
  $("#netFlow").textContent = signedMoney(net);
  $("#netFlow").style.color = net >= 0 ? "var(--mint)" : "var(--coral)";
  $("#pendingCount").textContent = pendingItems.length;
  $("#periodLabel").textContent = config.label;
  $("#categoryPeriod").textContent = `${config.shortLabel} · ${state.account === "all" ? "all sources" : accountById(state.account).name}`;
}

function categoryStats() {
  const items = periodTransactions().filter(item => item.direction === "expense");
  const grouped = {};
  items.forEach(item => {
    grouped[item.category] ||= { id:item.category, confirmed:0, pending:0, pendingCount:0, items:[] };
    grouped[item.category].items.push(item);
    if (item.status === "confirmed") grouped[item.category].confirmed += item.amount;
    if (item.status === "pending") { grouped[item.category].pending += item.amount; grouped[item.category].pendingCount += 1; }
  });
  return Object.values(grouped).sort((a,b) => (b.confirmed+b.pending) - (a.confirmed+a.pending));
}

function renderCategories() {
  const stats = categoryStats();
  const totalConfirmed = stats.reduce((sum,item) => sum + item.confirmed,0) || 1;
  $("#categoryList").innerHTML = stats.length ? stats.map(item => {
    const meta = categoryById(item.id);
    const share = item.confirmed / totalConfirmed * 100;
    return `<button class="category-card" data-category="${item.id}"><span class="category-icon">${meta.icon}</span><span class="category-main"><span class="category-title">${meta.name}${item.pendingCount ? `<i class="warning" aria-label="${item.pendingCount} pending">!</i>` : ""}</span><span class="category-sub">${share.toFixed(0)}% of confirmed spending</span><span class="category-track"><i style="--share:${Math.max(4,share)}%"></i></span></span><span class="category-amount"><strong>${money(item.confirmed)}</strong>${item.pending ? `<small>+${money(item.pending)} pending</small>` : ""}</span></button>`;
  }).join("") : `<div class="empty-state">No spending in this selection.</div>`;
}

function filteredHistory() {
  const query = state.query.trim().toLowerCase();
  return periodTransactions().filter(item => {
    const account = accountById(item.account);
    const category = categoryById(item.category);
    const searchable = `${item.merchant} ${category.name} ${account.name} ${(item.tags||[]).join(" ")}`.toLowerCase();
    return (!query || searchable.includes(query)) && (state.historyStatus === "all" || item.status === state.historyStatus);
  }).sort((a,b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return b.date.localeCompare(a.date);
  });
}

function transactionRow(item) {
  const category = categoryById(item.category);
  const account = accountById(item.account);
  const sign = item.direction === "income" ? "+" : "−";
  return `<article class="transaction-row ${item.status === "pending" ? "pending" : ""}" data-transaction="${item.id}" tabindex="0"><span class="tx-icon">${category.icon}</span><span class="tx-copy"><span class="tx-name">${item.merchant}</span><span class="tx-meta">${category.name} · ${account.name} · ${formatDate(item.date)}</span></span><span class="tx-amount ${item.direction === "income" ? "income" : ""}">${sign}${money(item.amount)}${item.status === "pending" ? `<small>${item.possibleDuplicateOf ? "Possible duplicate" : "Needs review"}</small>` : ""}</span>${item.status === "pending" ? `<button class="confirm-button" data-confirm="${item.id}" aria-label="Confirm ${item.merchant}">✓</button>` : `<span></span>`}</article>`;
}

function renderHistory() {
  const items = filteredHistory();
  $("#historyResultCount").textContent = `${items.length} record${items.length === 1 ? "" : "s"}`;
  $("#historyList").innerHTML = items.length ? items.map(transactionRow).join("") : `<div class="empty-state">No transactions match the current search and filters.</div>`;
}

function renderAccounts() {
  $("#accountsTotal").textContent = money(trackedBalance("all"));
  $("#accountsSummaryMeta").textContent = `${accounts.length} included sources · confirmed records only`;
  $("#accountList").innerHTML = accounts.map(account => {
    const periodItems = transactions.filter(item => item.account === account.id && item.status !== "excluded" && inRange(item.date,periodConfig().start,periodConfig().end));
    const net = amountTotal(periodItems.filter(item=>item.status==="confirmed"),"income") - amountTotal(periodItems.filter(item=>item.status==="confirmed"),"expense");
    const pendingCount = periodItems.filter(item => item.status === "pending").length;
    return `<button class="account-card" data-account-detail="${account.id}"><span class="account-card-top"><span class="account-logo ${account.className}">${account.logo}</span><span><span class="account-name">${account.name}</span><span class="account-meta">${account.type} · ${account.masked}</span></span><span class="account-balance">${money(trackedBalance(account.id))}<small>Tracked</small></span></span><span class="account-card-foot"><span class="${account.status === "Connected" ? "connected" : ""}">● ${account.status}</span><span>${signedMoney(net)} net flow</span><span>${pendingCount} pending</span></span></button>`;
  }).join("");
}

function renderAll() {
  renderSourceFilter();
  renderChart();
  renderSummary();
  renderCategories();
  renderHistory();
  renderAccounts();
}

function formatDate(date) { return new Intl.DateTimeFormat("en-GB", { day:"numeric", month:"short" }).format(new Date(`${date}T12:00:00`)); }

function openDrawer({ eyebrow, title, content }) {
  $("#drawerEyebrow").textContent = eyebrow;
  $("#drawerTitle").textContent = title;
  $("#drawerContent").innerHTML = content;
  $("#drawerLayer").classList.add("open");
  $("#drawerLayer").setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  $("#drawerLayer").classList.remove("open");
  $("#drawerLayer").setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

function openCategory(categoryId) {
  const meta = categoryById(categoryId);
  const items = periodTransactions().filter(item => item.direction === "expense" && item.category === categoryId);
  const confirmedItems = items.filter(item => item.status === "confirmed").sort((a,b)=>b.amount-a.amount);
  const pendingItems = items.filter(item => item.status === "pending").sort((a,b)=>b.amount-a.amount);
  const confirmedTotal = confirmedItems.reduce((sum,item)=>sum+item.amount,0);
  const pendingTotal = pendingItems.reduce((sum,item)=>sum+item.amount,0);
  const allConfirmedSpend = amountTotal(confirmed(),"expense") || 1;
  const largest = confirmedItems[0];
  const merchantCounts = confirmedItems.reduce((map,item)=>{map[item.merchant]=(map[item.merchant]||0)+1;return map;},{});
  const mainMerchant = Object.entries(merchantCounts).sort((a,b)=>b[1]-a[1])[0];
  const context = `${periodConfig().label} · ${state.account === "all" ? "All sources" : accountById(state.account).name}`;
  const row = item => `<button class="drawer-row" data-transaction="${item.id}"><span><strong>${item.merchant}</strong><small>${formatDate(item.date)} · ${accountById(item.account).name}${item.status==="pending"?" · needs review":""}</small></span><span><strong>−${money(item.amount)}</strong><small>${item.confidence} confidence</small></span></button>`;
  openDrawer({ eyebrow:context, title:`${meta.icon} ${meta.name}`, content:`<div class="detail-hero"><span>Confirmed spending</span><strong>${money(confirmedTotal)}</strong><small>${pendingTotal ? `${money(pendingTotal)} across ${pendingItems.length} pending item${pendingItems.length===1?"":"s"}` : "No pending expenses"}</small></div><div class="stat-grid"><div class="mini-stat"><small>Share of spending</small><strong>${(confirmedTotal/allConfirmedSpend*100).toFixed(0)}%</strong></div><div class="mini-stat"><small>Average purchase</small><strong>${money(confirmedItems.length?confirmedTotal/confirmedItems.length:0)}</strong></div><div class="mini-stat"><small>Largest purchase</small><strong>${largest?money(largest.amount):"—"}</strong></div><div class="mini-stat"><small>Main merchant</small><strong>${mainMerchant?mainMerchant[0]:"—"}</strong></div></div>${pendingItems.length?`<section class="drawer-section"><h3>Needs your review (${pendingItems.length})</h3><div class="drawer-list">${pendingItems.map(row).join("")}</div></section>`:""}<section class="drawer-section"><h3>Purchases · largest first</h3><div class="drawer-list">${confirmedItems.length?confirmedItems.map(row).join(""):`<div class="empty-state">No confirmed purchases.</div>`}</div></section>` });
}

function openAccount(accountId) {
  const account = accountById(accountId);
  const items = transactions.filter(item => item.account === accountId && item.status !== "excluded" && inRange(item.date,periodConfig().start,periodConfig().end));
  const confirmedItems = items.filter(item => item.status === "confirmed");
  const pendingItems = items.filter(item => item.status === "pending");
  const income = amountTotal(confirmedItems,"income");
  const expenses = amountTotal(confirmedItems,"expense");
  const recent = [...items].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);
  openDrawer({ eyebrow:`${account.type} · ${account.masked}`, title:account.name, content:`<div class="detail-hero"><span>Tracked available</span><strong>${money(trackedBalance(accountId))}</strong><small>${account.status} · updated ${account.updated}</small></div><div class="stat-grid"><div class="mini-stat"><small>${periodConfig().label} income</small><strong>${money(income)}</strong></div><div class="mini-stat"><small>${periodConfig().label} spending</small><strong>${money(expenses)}</strong></div><div class="mini-stat"><small>Net flow</small><strong>${signedMoney(income-expenses)}</strong></div><div class="mini-stat"><small>Pending review</small><strong>${pendingItems.length}</strong></div></div><section class="drawer-section"><h3>Recent from this source</h3><div class="drawer-list">${recent.map(item=>`<button class="drawer-row" data-transaction="${item.id}"><span><strong>${item.merchant}</strong><small>${formatDate(item.date)} · ${categoryById(item.category).name}</small></span><span><strong>${item.direction==="income"?"+":"−"}${money(item.amount)}</strong><small>${item.status}</small></span></button>`).join("")}</div></section><div class="drawer-actions"><button class="secondary-action" data-demo-action="Account management">Manage source</button><button class="primary-action" data-filter-account="${accountId}">View on Home</button></div>` });
}

function openTransaction(transactionId) {
  const item = transactions.find(transaction => transaction.id === transactionId);
  if (!item) return;
  const account = accountById(item.account);
  const category = categoryById(item.category);
  openDrawer({ eyebrow:item.status === "pending" ? "Needs confirmation" : "Confirmed transaction", title:item.merchant, content:`<div class="detail-hero"><span>${category.name}</span><strong>${item.direction==="income"?"+":"−"}${money(item.amount)}</strong><small>${formatDate(item.date)} · ${account.name} ${account.masked}</small></div><div class="stat-grid"><div class="mini-stat"><small>Status</small><strong>${item.status}</strong></div><div class="mini-stat"><small>Confidence</small><strong>${item.confidence}</strong></div></div><div class="provenance"><strong>Why am I seeing this?</strong>Detected from ${item.channel}. Ledgerly extracted merchant, amount, currency, date, and source. No bank credentials are stored in this demo.${item.possibleDuplicateOf ? " A similar confirmed purchase was found, so this item needs review." : ""}</div>${item.status === "pending" ? `<div class="drawer-actions"><button class="secondary-action" data-exclude="${item.id}">Exclude</button><button class="primary-action" data-confirm="${item.id}">Confirm</button></div>` : ""}` });
}

function confirmTransaction(id) {
  const item = transactions.find(transaction => transaction.id === id);
  if (!item || item.status !== "pending") return;
  item.status = "confirmed";
  closeDrawer();
  renderAll();
  showToast(`${item.merchant} confirmed. Every summary has been recalculated.`);
}

function excludeTransaction(id) {
  const item = transactions.find(transaction => transaction.id === id);
  if (!item || item.status !== "pending") return;
  item.status = "excluded";
  closeDrawer();
  renderAll();
  showToast(`${item.merchant} excluded from totals.`);
}

function switchView(view) {
  state.view = view;
  $$(".view").forEach(section => section.classList.toggle("active", section.id === `${view}View`));
  $$("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#pageTitle").textContent = view === "home" ? "Good afternoon, Antonio" : view === "accounts" ? "Accounts" : "Profile & settings";
  window.scrollTo({ top:0, behavior:"smooth" });
}

let toastTimer;
function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(()=>toast.classList.remove("show"),2900); }

document.addEventListener("click", event => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) { switchView(viewButton.dataset.view); return; }
  const periodButton = event.target.closest("[data-period]");
  if (periodButton) { state.period = periodButton.dataset.period; $$('[data-period]').forEach(button=>button.classList.toggle('active',button===periodButton)); renderAll(); return; }
  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) { openCategory(categoryButton.dataset.category); return; }
  const accountButton = event.target.closest("[data-account-detail]");
  if (accountButton) { openAccount(accountButton.dataset.accountDetail); return; }
  const transactionButton = event.target.closest("[data-transaction]");
  if (transactionButton && !event.target.closest("[data-confirm]")) { openTransaction(transactionButton.dataset.transaction); return; }
  const confirmButton = event.target.closest("[data-confirm]");
  if (confirmButton) { event.stopPropagation(); confirmTransaction(confirmButton.dataset.confirm); return; }
  const excludeButton = event.target.closest("[data-exclude]");
  if (excludeButton) { excludeTransaction(excludeButton.dataset.exclude); return; }
  const filterAccountButton = event.target.closest("[data-filter-account]");
  if (filterAccountButton) { state.account = filterAccountButton.dataset.filterAccount; closeDrawer(); switchView("home"); renderAll(); showToast(`Home filtered to ${accountById(state.account).name}.`); return; }
  const demoAction = event.target.closest("[data-demo-action]");
  if (demoAction) showToast(`${demoAction.dataset.demoAction} is outside this no-backend demo.`);
});

$("#sourceFilter").addEventListener("change", event => { state.account = event.target.value; renderAll(); });
$("#historySearch").addEventListener("input", event => { state.query = event.target.value; renderHistory(); });
$("#statusFilters").addEventListener("click", event => { const button = event.target.closest("[data-status]"); if (!button) return; state.historyStatus = button.dataset.status; $$("[data-status]").forEach(item=>item.classList.toggle("active",item===button)); renderHistory(); });
$("#pendingShortcut").addEventListener("click", () => { state.historyStatus = "pending"; $$("[data-status]").forEach(item=>item.classList.toggle("active",item.dataset.status==="pending")); renderHistory(); $("#historySection").scrollIntoView({ behavior:"smooth", block:"start" }); });
$("#closeDrawer").addEventListener("click", closeDrawer);
$("#drawerBackdrop").addEventListener("click", closeDrawer);
document.addEventListener("keydown", event => { if (event.key === "Escape") closeDrawer(); });

renderAll();
