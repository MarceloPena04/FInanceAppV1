"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
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
  { name: "Whole Foods Market", category: "Groceries", date: "Today, 9:42 AM", amount: "-$84.32", color: "bg-[#f6d8d2]", icon: "WF" },
  { name: "Spotify", category: "Entertainment", date: "Yesterday", amount: "-$10.99", color: "bg-[#dce8c9]", icon: "S" },
  { name: "Blue Bottle Coffee", category: "Dining", date: "Yesterday", amount: "-$6.50", color: "bg-[#d7e1ee]", icon: "BB" },
  { name: "Acme, Inc.", category: "Income", date: "May 24", amount: "+$3,200.00", color: "bg-[#cfe8da]", icon: "A" },
];

const bars = [38, 52, 41, 62, 48, 78, 57, 66, 45, 71, 59, 88, 63, 54, 76, 69, 84, 58, 72, 91, 65, 80, 71, 95, 74, 67, 86, 78, 92, 84];

export default function Home() {
  const [range, setRange] = useState("This month");
  const [activeNav, setActiveNav] = useState("Overview");
  const [showPending, setShowPending] = useState(true);
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#18211d]">
      <div className="mx-auto flex min-h-screen max-w-[1540px]">
        <aside className={`${mobileNav ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[#dfe5df] bg-[#f8faf7] px-6 py-7 transition-transform lg:static lg:translate-x-0`}>
          <div className="mb-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#b9e7ca] text-[#173e2a]"><Sparkles size={17} /></span>
              <span className="text-[17px] font-bold tracking-[-0.04em]">pennywise</span>
            </div>
            <button className="text-[#7c8880] lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20} /></button>
          </div>
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa49d]">Workspace</div>
          <nav className="space-y-1">
            {navItems.map(({ label, icon: Icon }) => (
              <button key={label} onClick={() => { setActiveNav(label); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${activeNav === label ? "bg-[#e2f4e7] text-[#246a43]" : "text-[#68736c] hover:bg-[#edf2ed]"}`}>
                <Icon size={17} strokeWidth={1.8} />{label}
              </button>
            ))}
          </nav>
          <div className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa49d]">Manage</div>
          <nav className="space-y-1">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-[#68736c] hover:bg-[#edf2ed]"><Settings size={17} strokeWidth={1.8} />Settings</button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-[#68736c] hover:bg-[#edf2ed]"><CircleHelp size={17} strokeWidth={1.8} />Help center</button>
          </nav>
          <div className="mt-auto rounded-2xl bg-[#e8f5eb] p-4">
            <div className="mb-3 flex items-center justify-between"><ShieldCheck size={20} className="text-[#2f8a56]" /><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4f8061]">Private by default</span></div>
            <p className="text-[12px] leading-5 text-[#5a7864]">Your financial data is encrypted and never sold.</p>
            <button className="mt-3 text-[11px] font-bold text-[#297648] underline underline-offset-2">Learn about privacy</button>
          </div>
          <div className="mt-6 flex items-center gap-3 border-t border-[#e0e6e1] pt-5"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#e8c7b7] text-[11px] font-bold text-[#744c3d]">MC</div><div><p className="text-[12px] font-bold">Maya Chen</p><p className="text-[11px] text-[#89938c]">Personal workspace</p></div><MoreHorizontal size={16} className="ml-auto text-[#9ba49d]" /></div>
        </aside>

        <section className="min-w-0 flex-1 px-5 py-5 sm:px-8 lg:px-12 lg:py-8">
          <header className="mb-8 flex items-center justify-between">
            <button className="rounded-lg p-2 text-[#53615a] hover:bg-white lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <div className="hidden lg:block"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8c968f]">Tuesday, May 28, 2024</p><h1 className="mt-1 text-[26px] font-semibold tracking-[-0.04em]">Good morning, Maya <span aria-hidden="true">✦</span></h1></div>
            <div className="flex items-center gap-2 sm:gap-3"><button className="hidden h-9 items-center gap-2 rounded-lg border border-[#dde4de] bg-white px-3 text-[12px] font-semibold text-[#67736b] sm:flex"><CalendarDays size={15} />May 2024<ChevronDown size={14} /></button><button className="relative grid h-9 w-9 place-items-center rounded-lg border border-[#dde4de] bg-white text-[#657169]" aria-label="Notifications"><Bell size={16} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e77d5f]" /></button><button className="grid h-9 w-9 place-items-center rounded-lg bg-[#193f2a] text-white" aria-label="Add transaction"><Plus size={18} /></button></div>
          </header>

          <div className="mb-9 lg:hidden"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c968f]">Tuesday, May 28, 2024</p><h1 className="mt-1 text-[24px] font-semibold tracking-[-0.04em]">Good morning, Maya <span aria-hidden="true">✦</span></h1></div>

          <div className="mb-8 grid gap-4 xl:grid-cols-[1.25fr_1fr_1fr]">
            <div className="rounded-2xl bg-[#193f2a] p-5 text-white shadow-[0_8px_30px_rgba(24,63,42,0.12)] sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#a9c8b1]">Total balance</p><p className="mt-3 text-[34px] font-semibold tracking-[-0.06em]">$24,680.42</p></div><Wallet size={21} className="text-[#b9e7ca]" /></div><div className="mt-8 flex items-center justify-between border-t border-white/15 pt-3 text-[11px]"><span className="text-[#b7cdbc]">Across 3 accounts</span><span className="flex items-center gap-1 font-semibold text-[#b9e7ca]"><ArrowUpRight size={13} />4.8% this month</span></div></div>
            <div className="rounded-2xl border border-[#e0e6e0] bg-white p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8d9890]">Income</p><p className="mt-3 text-[25px] font-semibold tracking-[-0.05em]">$5,200.00</p></div><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e4f4e8] text-[#3c9760]"><ArrowDownLeft size={17} /></span></div><div className="mt-7 flex items-center gap-1 text-[11px] font-semibold text-[#3e9560]"><ArrowUpRight size={13} />12.5% <span className="font-normal text-[#9ba49e]">vs last month</span></div></div>
            <div className="rounded-2xl border border-[#e0e6e0] bg-white p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8d9890]">Spending</p><p className="mt-3 text-[25px] font-semibold tracking-[-0.05em]">$1,842.67</p></div><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fce9e3] text-[#dc765c]"><ArrowUpRight size={17} /></span></div><div className="mt-7 flex items-center gap-1 text-[11px] font-semibold text-[#dc765c]"><ArrowUpRight size={13} />8.2% <span className="font-normal text-[#9ba49e]">vs last month</span></div></div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-2xl border border-[#e0e6e0] bg-white p-5 sm:p-6"><div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[15px] font-bold tracking-[-0.02em]">Cash flow</h2><p className="mt-1 text-[12px] text-[#8a958e]">Income and spending · {range.toLowerCase()}</p></div><div className="flex items-center rounded-lg bg-[#f4f6f3] p-1">{["Week", "Month", "Year"].map((item) => <button key={item} onClick={() => setRange(item)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold ${item === range ? "bg-white text-[#285f40] shadow-sm" : "text-[#89938c]"}`}>{item}</button>)}</div></div><div className="mb-2 flex items-center gap-5 text-[11px] text-[#748078]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#59ad79]" />Income</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#e68a70]" />Spending</span></div><div className="flex h-[180px] items-end gap-1.5 border-b border-[#e8ece8] pt-4 sm:gap-2">{bars.map((height, index) => <div key={index} className="group relative flex h-full items-end"><div className="w-full rounded-t-[3px] bg-[#ccebd6] transition-all group-hover:bg-[#59ad79]" style={{ height: `${height}%` }} /><div className="absolute bottom-0 left-1/2 hidden h-[65%] w-1 -translate-x-1/2 rounded-t bg-[#f2b9a8] group-hover:block" /></div>)}</div><div className="mt-3 flex justify-between text-[10px] text-[#a0aaa3]"><span>{range === "Week" ? "Mon" : range === "Year" ? "Jan" : "May 1"}</span><span>{range === "Week" ? "Tue" : range === "Year" ? "Apr" : "May 8"}</span><span>{range === "Week" ? "Wed" : range === "Year" ? "Jul" : "May 15"}</span><span>{range === "Week" ? "Thu" : range === "Year" ? "Oct" : "May 22"}</span><span>{range === "Week" ? "Fri" : range === "Year" ? "Dec" : "May 28"}</span></div></section>
            <section className="rounded-2xl border border-[#e0e6e0] bg-white p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-[15px] font-bold tracking-[-0.02em]">Spending by category</h2><p className="mt-1 text-[12px] text-[#8a958e]">This month</p></div><button className="text-[#9aa49d]" aria-label="More category options"><MoreHorizontal size={18} /></button></div><div className="flex items-center gap-6"><div className="relative grid h-[118px] w-[118px] shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#e68a70 0 34%, #88c99d 34% 59%, #edc77e 59% 78%, #9db8d0 78% 90%, #d9ded8 90% 100%)" }}><div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white text-center"><span className="text-[17px] font-bold">$1.8k</span><span className="text-[9px] text-[#9aa49d]">total</span></div></div><div className="min-w-0 flex-1 space-y-3">{[["Housing", "$620", "#e68a70"], ["Food & dining", "$452", "#88c99d"], ["Shopping", "$349", "#edc77e"], ["Transport", "$220", "#9db8d0"]].map(([label, amount, color]) => <div key={label} className="flex items-center justify-between gap-2 text-[11px]"><span className="flex items-center gap-2 truncate text-[#67736b]"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span><span className="font-bold">{amount}</span></div>)}</div></div><button className="mt-6 w-full rounded-lg border border-[#dfe6df] py-2 text-[11px] font-bold text-[#47745a] hover:bg-[#f5faf6]">View all categories</button></section>
          </div>

          <section className="mt-5 rounded-2xl border border-[#e0e6e0] bg-white p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[15px] font-bold tracking-[-0.02em]">Recent transactions</h2><p className="mt-1 text-[12px] text-[#8a958e]">Your latest activity across all accounts</p></div><div className="flex w-full gap-2 sm:w-auto"><div className="relative flex-1 sm:w-52"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9da8a0]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" className="h-9 w-full rounded-lg border border-[#e0e6e0] bg-[#fbfcfb] pl-9 pr-3 text-[11px] outline-none placeholder:text-[#a1aaa4] focus:border-[#81bd95]" /></div><button className="grid h-9 w-9 place-items-center rounded-lg border border-[#e0e6e0] text-[#718078]" aria-label="Filter transactions"><Filter size={15} /></button></div></div><div className="divide-y divide-[#edf0ed]">{filteredTransactions.map((transaction) => <div key={transaction.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[10px] font-bold text-[#496052] ${transaction.color}`}>{transaction.icon}</div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold">{transaction.name}</p><p className="mt-0.5 text-[10px] text-[#9aa49d]">{transaction.category} · {transaction.date}</p></div><p className={`text-[12px] font-bold ${transaction.amount.startsWith("+") ? "text-[#3c9560]" : "text-[#26352c]"}`}>{transaction.amount}</p><button className="hidden text-[#adb5af] sm:block" aria-label={`More options for ${transaction.name}`}><MoreHorizontal size={16} /></button></div>)}</div></section>

          {showPending && <section className="mt-5 flex items-start gap-3 rounded-2xl border border-[#f1dccd] bg-[#fff8f3] p-4"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f8dfd1] text-[#d27559]"><Bell size={16} /></div><div className="flex-1"><p className="text-[12px] font-bold">3 transactions need your review</p><p className="mt-1 text-[11px] leading-5 text-[#9c7d6e]">We found a few new transactions from your connected accounts.</p></div><button onClick={() => setShowPending(false)} className="rounded-lg bg-[#e98768] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#d9775a]">Review now</button><button onClick={() => setShowPending(false)} className="p-1 text-[#b59a8d]" aria-label="Dismiss pending transaction notice"><X size={15} /></button></section>}

          <footer className="flex flex-col gap-2 py-8 text-[10px] text-[#99a39b] sm:flex-row sm:items-center sm:justify-between"><span>Last synced just now · Sources are encrypted</span><span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Your data stays yours</span></footer>
        </section>
      </div>
    </main>
  );
}
