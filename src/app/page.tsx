"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Filter,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  Wallet,
  X,
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Transactions", icon: CreditCard },
  { label: "Accounts", icon: Wallet },
  { label: "Categories", icon: Tags },
];

const transactions = [
  { name: "Whole Foods Market", category: "Groceries", date: "Today, 9:42 AM", amount: "-$84.32", color: "bg-[#f8ded8]", icon: "WF" },
  { name: "Spotify", category: "Entertainment", date: "Yesterday", amount: "-$10.99", color: "bg-[#d9e9e7]", icon: "S" },
  { name: "Blue Bottle Coffee", category: "Dining", date: "Yesterday", amount: "-$6.50", color: "bg-[#dce5f2]", icon: "BB" },
  { name: "Acme, Inc.", category: "Income", date: "May 24", amount: "+$3,200.00", color: "bg-[#d5e8df]", icon: "A" },
];

const accountSources = [
  { id: "all", name: "All sources", balance: "$24,680.42", change: "4.8%", context: "Across 3 connected accounts" },
  { id: "checking", name: "Everyday checking", balance: "$12,840.16", change: "3.2%", context: "Chase ···· 4821" },
  { id: "savings", name: "High-yield savings", balance: "$10,240.26", change: "6.1%", context: "Ally ···· 1170" },
  { id: "card", name: "Rewards card", balance: "$1,600.00", change: "1.4%", context: "Amex ···· 9034" },
] as const;

const cashFlowSummaries = [
  {
    id: "weekly",
    title: "Weekly summary",
    description: "Daily cash flow for this week",
    total: "+$486.28",
    detail: "Net cash flow",
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    income: [46, 72, 38, 58, 92, 28, 42],
    spending: [32, 48, 26, 39, 54, 22, 31],
  },
  {
    id: "monthly",
    title: "Monthly summary",
    description: "Weekly cash flow for May",
    total: "+$3,357.33",
    detail: "Net cash flow",
    labels: ["May 1", "May 8", "May 15", "May 22", "May 28"],
    income: [74, 52, 88, 61, 96],
    spending: [45, 68, 51, 43, 57],
  },
] as const;

function CashFlowChart({ summary }: { summary: (typeof cashFlowSummaries)[number] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-5 text-[11px] text-[#657286]">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#18a999]" />Income</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#e27a68]" />Spending</span>
      </div>
      <div className="flex h-[168px] items-end gap-2 border-b border-[#e3e8ee] pt-4 sm:gap-3">
        {summary.labels.map((label, index) => (
          <div key={label} className="group flex h-full min-w-0 flex-1 items-end justify-center gap-1.5" aria-label={`${label}: income ${summary.income[index]}%, spending ${summary.spending[index]}%`}>
            <div className="w-2.5 rounded-t-[3px] bg-[#a9ddd5] transition-colors group-hover:bg-[#18a999] sm:w-3" style={{ height: `${summary.income[index]}%` }} />
            <div className="w-2.5 rounded-t-[3px] bg-[#f3c0b5] transition-colors group-hover:bg-[#e27a68] sm:w-3" style={{ height: `${summary.spending[index]}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-[#8793a3]">
        {summary.labels.map((label) => <span key={label}>{label}</span>)}
      </div>
    </div>
  );
}

export default function Home() {
  const [accountId, setAccountId] = useState<(typeof accountSources)[number]["id"]>("all");
  const [summaryId, setSummaryId] = useState<(typeof cashFlowSummaries)[number]["id"]>("weekly");
  const [activeNav, setActiveNav] = useState("Overview");
  const [transactionItems, setTransactionItems] = useState(transactions);
  const [transactionFilter, setTransactionFilter] = useState<"all" | "income" | "spending">("all");
  const [showPending, setShowPending] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newTransactionName, setNewTransactionName] = useState("");
  const [newTransactionAmount, setNewTransactionAmount] = useState("");
  const [newTransactionCategory, setNewTransactionCategory] = useState("Other");
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const filteredTransactions = transactionItems.filter((transaction) =>
    transaction.name.toLowerCase().includes(search.toLowerCase()) &&
    (transactionFilter === "all" || (transactionFilter === "income" ? transaction.amount.startsWith("+") : !transaction.amount.startsWith("+"))),
  );
  const selectedAccount = accountSources.find((account) => account.id === accountId) ?? accountSources[0];
  const selectedSummary = cashFlowSummaries.find((summary) => summary.id === summaryId) ?? cashFlowSummaries[0];

  const showFeedback = (message: string) => {
    setFeedback(message);
  };

  const handleAddTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(newTransactionAmount);
    if (!newTransactionName.trim() || !amount || amount < 0) return;

    const isIncome = newTransactionCategory === "Income";
    setTransactionItems((current) => [{
      name: newTransactionName.trim(),
      category: newTransactionCategory,
      date: "Today",
      amount: `${isIncome ? "+" : "-"}$${amount.toFixed(2)}`,
      color: isIncome ? "bg-[#d5e8df]" : "bg-[#d9e9e7]",
      icon: newTransactionName.trim().slice(0, 2).toUpperCase(),
    }, ...current]);
    setNewTransactionName("");
    setNewTransactionAmount("");
    setNewTransactionCategory("Other");
    setShowAddTransaction(false);
    showFeedback("Transaction added to this mock workspace.");
  };

  return (
    <main className="min-h-screen bg-[#e4ecef] text-[#162235]">
      <div className="mx-auto flex min-h-screen max-w-[1540px]">
        <aside className={`${mobileNav ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[#dce3e9] bg-[#edf2f5] px-6 py-7 transition-transform lg:static lg:translate-x-0`}>
          <div className="mb-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#b9e4df] text-[#075e59]"><Sparkles size={17} /></span>
              <span className="text-[17px] font-bold tracking-[-0.04em]">pennywise</span>
            </div>
            <button className="text-[#66758a] lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20} /></button>
          </div>
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8290a1]">Workspace</div>
          <nav className="space-y-1">
            {navItems.map(({ label, icon: Icon }) => (
              <button key={label} onClick={() => { setActiveNav(label); setMobileNav(false); showFeedback(`${label} view selected. Mock navigation only.`); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${activeNav === label ? "bg-[#d8eeeb] text-[#087f73]" : "text-[#536276] hover:bg-[#e3eaee]"}`}>
                <Icon size={17} strokeWidth={1.8} />{label}
              </button>
            ))}
          </nav>
          <div className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8290a1]">Manage</div>
          <nav className="space-y-1">
            <button onClick={() => showFeedback("Settings are ready for the Supabase connection.")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-[#536276] hover:bg-[#e3eaee]"><Settings size={17} strokeWidth={1.8} />Settings</button>
            <button onClick={() => showFeedback("Help center opened in this mock workspace.")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-[#536276] hover:bg-[#e3eaee]"><CircleHelp size={17} strokeWidth={1.8} />Help center</button>
          </nav>
          <div className="mt-auto rounded-2xl bg-[#dcebea] p-4">
            <div className="mb-3 flex items-center justify-between"><ShieldCheck size={20} className="text-[#087f73]" /><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#28776f]">Private by default</span></div>
            <p className="text-[12px] leading-5 text-[#4d716f]">Your financial data is encrypted and never sold.</p>
            <button onClick={() => showFeedback("Privacy details are available in the connected-account setup.")} className="mt-3 text-[11px] font-bold text-[#087f73] underline underline-offset-2">Learn about privacy</button>
          </div>
          <div className="mt-6 flex items-center gap-3 border-t border-[#dce3e9] pt-5"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#f2d5c9] text-[11px] font-bold text-[#864f43]">MC</div><div><p className="text-[12px] font-bold">Maya Chen</p><p className="text-[11px] text-[#8290a1]">Personal workspace</p></div><MoreHorizontal size={16} className="ml-auto text-[#8793a3]" /></div>
        </aside>

        <section className="min-w-0 flex-1 px-5 py-5 sm:px-8 lg:px-12 lg:py-8">
          <header className="mb-8 flex items-center justify-between">
            <button className="rounded-lg p-2 text-[#536276] hover:bg-[#f4f8f9] lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <div className="hidden lg:block"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8290a1]">Tuesday, May 28, 2024</p><h1 className="mt-1 text-[26px] font-semibold tracking-[-0.04em]">Good morning, Maya <span aria-hidden="true">✦</span></h1></div>
            <div className="flex items-center gap-2 sm:gap-3"><div className="relative"><button onClick={() => setShowMonthMenu((current) => !current)} className="hidden h-9 items-center gap-2 rounded-lg border border-[#cbd9df] bg-[#f4f8f9] px-3 text-[12px] font-semibold text-[#536276] sm:flex"><CalendarDays size={15} />May 2024<ChevronDown size={14} /></button>{showMonthMenu && <div className="absolute right-0 top-11 z-20 w-36 rounded-xl border border-[#cbd9df] bg-[#f8fbfb] p-1 shadow-lg"><button onClick={() => { setShowMonthMenu(false); showFeedback("April 2024 selected for this mock dashboard."); }} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-[#536276] hover:bg-[#e3eff0]">April 2024</button><button onClick={() => { setShowMonthMenu(false); showFeedback("May 2024 selected for this mock dashboard."); }} className="w-full rounded-lg bg-[#e3eff0] px-3 py-2 text-left text-[11px] font-semibold text-[#087f73]">May 2024</button><button onClick={() => { setShowMonthMenu(false); showFeedback("June 2024 selected for this mock dashboard."); }} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-[#536276] hover:bg-[#e3eff0]">June 2024</button></div>}</div><div className="relative"><button onClick={() => setShowNotifications((current) => !current)} className="relative grid h-9 w-9 place-items-center rounded-lg border border-[#cbd9df] bg-[#f4f8f9] text-[#536276]" aria-label="Notifications"><Bell size={16} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e27a68]" /></button>{showNotifications && <div className="absolute right-0 top-11 z-20 w-64 rounded-xl border border-[#cbd9df] bg-[#f8fbfb] p-4 shadow-lg"><p className="text-[12px] font-bold">Notifications</p><p className="mt-1 text-[11px] leading-5 text-[#718096]">3 transactions need review. Your accounts were synced just now.</p><button onClick={() => { setShowNotifications(false); setShowPending(true); showFeedback("Review reminder opened."); }} className="mt-3 text-[11px] font-bold text-[#087f73]">Review activity</button></div>}</div><button onClick={() => setShowAddTransaction(true)} className="grid h-9 w-9 place-items-center rounded-lg bg-[#162b46] text-white" aria-label="Add transaction"><Plus size={18} /></button></div>
          </header>

          <div className="mb-9 lg:hidden"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8290a1]">Tuesday, May 28, 2024</p><h1 className="mt-1 text-[24px] font-semibold tracking-[-0.04em]">Good morning, Maya <span aria-hidden="true">✦</span></h1></div>

          <section className="mb-5 rounded-2xl border border-[#cbd9df] bg-[#f8fbfb] p-5 shadow-[0_12px_30px_rgba(47,78,91,0.06)] sm:p-7">
            <div className="flex flex-col gap-6 border-b border-[#e7edf1] pb-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8290a1]">Balance view</p>
                    <div className="relative">
                      <select value={accountId} onChange={(event) => setAccountId(event.target.value as (typeof accountSources)[number]["id"])} aria-label="Choose account balance" className="h-7 appearance-none rounded-md border border-[#d8e3e8] bg-[#f7fafb] py-1 pl-2 pr-7 text-[11px] font-bold text-[#087f73] outline-none focus:border-[#62b9b0]">
                        {accountSources.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#087f73]" />
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1"><p className="text-[32px] font-semibold tracking-[-0.06em] text-[#162235] sm:text-[38px]">{selectedAccount.balance}</p><span className="flex items-center gap-1 text-[11px] font-bold text-[#087f73]"><ArrowUpRight size={13} />{selectedAccount.change} this month</span></div>
                  <p className="mt-1 text-[11px] text-[#8793a3]">{selectedAccount.context}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
                <div className="rounded-xl bg-[#f3f7f8] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8290a1]">Income</p><p className="mt-1 text-[18px] font-semibold tracking-[-0.04em] text-[#087f73]">$5,200</p><p className="mt-1 text-[10px] text-[#718096]">+12.5% this month</p></div>
                <div className="rounded-xl bg-[#fff5f2] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9b837e]">Spending</p><p className="mt-1 text-[18px] font-semibold tracking-[-0.04em] text-[#d56654]">$1,842</p><p className="mt-1 text-[10px] text-[#9b837e]">8.2% this month</p></div>
              </div>
            </div>
            <div className="mt-6 min-w-0">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-[15px] font-bold tracking-[-0.02em]">Cash flow</h2><p className="mt-1 text-[12px] text-[#718096]">{selectedSummary.description}</p></div>
                <div className="flex items-center gap-4">
                  <span className="hidden text-[17px] font-bold tracking-[-0.04em] text-[#087f73] sm:block">{selectedSummary.total} <span className="text-[10px] font-normal text-[#8793a3]">net</span></span>
                  <div className="flex rounded-lg bg-[#edf2f5] p-1" role="group" aria-label="Cash flow period">
                    {cashFlowSummaries.map((summary) => <button key={summary.id} onClick={() => setSummaryId(summary.id)} className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${summary.id === summaryId ? "bg-[#f8fbfb] text-[#087f73] shadow-sm" : "text-[#8290a1] hover:text-[#536276]"}`}>{summary.id === "weekly" ? "Weekly" : "Monthly"}</button>)}
                  </div>
                </div>
              </div>
              <CashFlowChart summary={selectedSummary} />
            </div>
          </section>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-[#c8dedd] bg-[#edf6f5] p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-[15px] font-bold tracking-[-0.02em]">Spending by category</h2><p className="mt-1 text-[12px] text-[#718096]">This month</p></div></div><div className="flex items-center gap-6"><div className="relative grid h-[118px] w-[118px] shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#e27a68 0 34%, #18a999 34% 59%, #e7b95f 59% 78%, #7d9fc4 78% 90%, #d5dce2 90% 100%)" }}><div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[#edf6f5] text-center"><span className="text-[17px] font-bold">$1.8k</span><span className="text-[9px] text-[#8793a3]">total</span></div></div><div className="min-w-0 flex-1 space-y-3">{[["Housing", "$620", "#e27a68"], ["Food & dining", "$452", "#18a999"], ["Shopping", "$349", "#e7b95f"], ["Transport", "$220", "#7d9fc4"]].map(([label, amount, color]) => <div key={label} className="flex items-center justify-between gap-2 text-[11px]"><span className="flex items-center gap-2 truncate text-[#536276]"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span><span className="font-bold">{amount}</span></div>)}</div></div></section>

          <section className="rounded-2xl border border-[#cbd9df] bg-[#f1f5f7] p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-[15px] font-bold tracking-[-0.02em]">Recent transactions</h2>{transactionFilter !== "all" && <span className="rounded-full bg-[#d8eeeb] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#087f73]">{transactionFilter}</span>}</div><p className="mt-1 text-[12px] text-[#718096]">Your latest activity across all accounts</p></div><div className="flex w-full gap-2 sm:w-auto"><div className="relative flex-1 sm:w-52"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8793a3]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" className="h-9 w-full rounded-lg border border-[#cbd9df] bg-[#f8fbfc] pl-9 pr-3 text-[11px] outline-none placeholder:text-[#9aa7b5] focus:border-[#62b9b0]" /></div><button onClick={() => { const nextFilter = transactionFilter === "all" ? "income" : transactionFilter === "income" ? "spending" : "all"; setTransactionFilter(nextFilter); showFeedback(`Showing ${nextFilter} transactions.`); }} className="grid h-9 w-9 place-items-center rounded-lg border border-[#cbd9df] text-[#657286]" aria-label="Cycle transaction filter"><Filter size={15} /></button></div></div><div className="divide-y divide-[#dce5e9]">{filteredTransactions.map((transaction) => <div key={transaction.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[10px] font-bold text-[#3e5960] ${transaction.color}`}>{transaction.icon}</div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold">{transaction.name}</p><p className="mt-0.5 text-[10px] text-[#8793a3]">{transaction.category} · {transaction.date}</p></div><p className={`text-[12px] font-bold ${transaction.amount.startsWith("+") ? "text-[#087f73]" : "text-[#26364b]"}`}>{transaction.amount}</p><button onClick={() => showFeedback(`${transaction.name} actions are mocked for now.`)} className="hidden text-[#a5b0bc] sm:block" aria-label={`More options for ${transaction.name}`}><MoreHorizontal size={16} /></button></div>)}</div></section>
          </div>

          {showPending && <section className="mt-5 flex items-start gap-3 rounded-2xl border border-[#f0dcd7] bg-[#fff7f5] p-4"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f7ddd7] text-[#d56654]"><Bell size={16} /></div><div className="flex-1"><p className="text-[12px] font-bold">3 transactions need your review</p><p className="mt-1 text-[11px] leading-5 text-[#8d6d68]">We found a few new transactions from your connected accounts.</p></div><button onClick={() => { setShowPending(false); showFeedback("Pending transactions marked for review."); }} className="rounded-lg bg-[#d56654] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#bd5545]">Review now</button><button onClick={() => { setShowPending(false); showFeedback("Review reminder dismissed."); }} className="p-1 text-[#a98b86]" aria-label="Dismiss pending transaction notice"><X size={15} /></button></section>}

          {showAddTransaction && <div className="fixed inset-0 z-40 grid place-items-center bg-[#162235]/35 p-5"><form onSubmit={handleAddTransaction} className="w-full max-w-md rounded-2xl border border-[#cbd9df] bg-[#f8fbfb] p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-[17px] font-bold">Add transaction</h2><p className="mt-1 text-[11px] text-[#718096]">This mock entry will appear at the top of your activity.</p></div><button type="button" onClick={() => setShowAddTransaction(false)} className="text-[#8793a3]" aria-label="Close add transaction dialog"><X size={18} /></button></div><div className="space-y-3"><label className="block text-[11px] font-bold text-[#536276]">Merchant or source<input required value={newTransactionName} onChange={(event) => setNewTransactionName(event.target.value)} placeholder="e.g. Rent or freelance invoice" className="mt-1 h-10 w-full rounded-lg border border-[#cbd9df] bg-[#f1f5f7] px-3 text-[12px] outline-none focus:border-[#62b9b0]" /></label><label className="block text-[11px] font-bold text-[#536276]">Amount<input required min="0.01" step="0.01" type="number" value={newTransactionAmount} onChange={(event) => setNewTransactionAmount(event.target.value)} placeholder="0.00" className="mt-1 h-10 w-full rounded-lg border border-[#cbd9df] bg-[#f1f5f7] px-3 text-[12px] outline-none focus:border-[#62b9b0]" /></label><label className="block text-[11px] font-bold text-[#536276]">Category<select value={newTransactionCategory} onChange={(event) => setNewTransactionCategory(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#cbd9df] bg-[#f1f5f7] px-3 text-[12px] outline-none focus:border-[#62b9b0]"><option>Other</option><option>Groceries</option><option>Dining</option><option>Entertainment</option><option>Income</option></select></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowAddTransaction(false)} className="rounded-lg px-3 py-2 text-[11px] font-bold text-[#536276] hover:bg-[#e3eaee]">Cancel</button><button type="submit" className="rounded-lg bg-[#162b46] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#087f73]">Add transaction</button></div></form></div>}

          {feedback && <button onClick={() => setFeedback(null)} className="fixed bottom-5 right-5 z-30 rounded-xl border border-[#b9d8d5] bg-[#d8eeeb] px-4 py-3 text-left text-[11px] font-bold text-[#075e59] shadow-lg">{feedback}</button>}

          <footer className="flex flex-col gap-2 py-8 text-[10px] text-[#8793a3] sm:flex-row sm:items-center sm:justify-between"><span>Last synced just now · Sources are encrypted</span><span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Your data stays yours</span></footer>
        </section>
      </div>
    </main>
  );
}
