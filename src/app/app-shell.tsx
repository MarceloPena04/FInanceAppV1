"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, ChartNoAxesCombined, Check, ChevronRight, CircleHelp, ClipboardCheck, CreditCard, LayoutDashboard, LogOut, Menu, Settings, Sparkles, Tags, Wallet, X } from "lucide-react";
import { useAuth } from "../auth/provider";
import { getAuthErrorMessage } from "../auth/types";
import { SUPPORTED_REPORTING_CURRENCIES } from "../domain/reporting-currency";
import { attentionReasons } from "../domain/review-queue";
import { effectiveValues } from "../domain/transaction-lifecycle";
import { effectLabel } from "./demo-utils";
import { useDemo } from "./demo-provider";
import "./navigation.css";

const workspaceLinks = [
  { href: "/", label: "Overview", icon: LayoutDashboard, title: "A clearer view of your money" },
  { href: "/transactions", label: "Transactions", icon: CreditCard, title: "Your transaction activity" },
  { href: "/review", label: "Review & approvals", icon: ClipboardCheck, title: "Review & approvals" },
  { href: "/reports", label: "Flow details", icon: ChartNoAxesCombined, title: "Understand your cash flow" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut, mode } = useAuth();
  const { state, setState, loaded, savingAvailable, currency, queue, sourceLabel, confirmSelection, announce } = useDemo();
  const [mobileNav, setMobileNav] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const navRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const previousPathRef = useRef(pathname);
  const currentPage = workspaceLinks.find(item => item.href === pathname);
  const title = currentPage?.title ?? (pathname === "/demo" ? "Workspace guide" : "Your workspace");
  const profileName = session?.user.name ?? "Your workspace";
  const initials = profileName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const previewReasons = new Set<string>();
  const attentionPreviews = queue.needsAttention.filter(record => {
    const reason = attentionReasons(record, state.records)[0] ?? "Check details";
    if (previewReasons.has(reason)) return false;
    previewReasons.add(reason);
    return true;
  }).slice(0, 2);
  const previews = [
    ...queue.ready.slice(0, 1).map(record => ({ record, ready: true })),
    ...attentionPreviews.map(record => ({ record, ready: false })),
  ];

  const closeNavigation = (restoreFocus = false) => {
    setMobileNav(false);
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  };
  const closeNotifications = (restoreFocus = false) => {
    setNotificationsOpen(false);
    if (restoreFocus) bellRef.current?.focus();
  };
  const openReviewPreview = (id: string) => {
    closeNotifications();
    if (pathname === "/review") requestAnimationFrame(() => document.getElementById(`review-record-${id}`)?.focus({ preventScroll: true }));
  };
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      setSignOutError(getAuthErrorMessage(error));
      setSigningOut(false);
    }
  };

  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    const frame = requestAnimationFrame(() => {
      setMobileNav(false);
      setNotificationsOpen(false);
      let fragment = window.location.hash.slice(1);
      try { fragment = decodeURIComponent(fragment); } catch { /* Keep a malformed fragment harmless. */ }
      const target = (fragment && document.getElementById(fragment)) || document.getElementById("page-heading");
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const content = contentRef.current;
    const update = () => {
      if (navRef.current) navRef.current.inert = !media.matches && !mobileNav;
      if (content) content.inert = !media.matches && mobileNav;
    };
    update();
    media.addEventListener("change", update);
    const previousOverflow = document.body.style.overflow;
    if (mobileNav && !media.matches) {
      document.body.style.overflow = "hidden";
      navRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
    const keyboard = (event: KeyboardEvent) => {
      if (!mobileNav || media.matches) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNav(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
      if (event.key === "Tab") {
        const controls = [...(navRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]") ?? [])];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      if (content) content.inert = false;
    };
  }, [mobileNav]);

  useEffect(() => {
    if (!notificationsOpen) return;
    notificationsRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !notificationsRef.current?.contains(target) && !bellRef.current?.contains(target)) {
        setNotificationsOpen(false);
        if (!(target instanceof Element) || !target.closest("a[href], button, input, select, textarea, [tabindex]")) bellRef.current?.focus();
      }
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setNotificationsOpen(false);
      bellRef.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", keyboard); };
  }, [notificationsOpen]);

  return <div className="pennywise-shell">
    <a href="#page-heading" className="skip-link">Skip to page content</a>
    <div className="pennywise-frame">
      {mobileNav && <div className="navigation-backdrop" onClick={() => closeNavigation(true)} aria-hidden="true" />}
      <aside id="workspace-navigation" ref={navRef} className="pennywise-sidebar" data-open={mobileNav} aria-label="Workspace navigation">
        <div className="sidebar-brand"><div><span className="brand-mark"><Sparkles size={17} /></span><span>pennywise</span></div><button className="sidebar-close icon-button" onClick={() => closeNavigation(true)} aria-label="Close navigation"><X size={20} /></button></div>
        <p className="eyebrow sidebar-caption">Workspace</p>
        <nav className="sidebar-nav" aria-label="Workspace pages">
          {workspaceLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "is-active" : undefined} aria-current={pathname === href ? "page" : undefined} onClick={() => closeNavigation(mobileNav && pathname === href)}><Icon size={17} />{label}</Link>)}
          <button disabled title="Account management is coming soon"><Wallet size={17} />Accounts<span>Soon</span></button>
          <button disabled title="Categories are coming soon"><Tags size={17} />Categories<span>Soon</span></button>
        </nav>
        <p className="eyebrow sidebar-caption sidebar-caption--manage">Manage</p>
        <nav className="sidebar-nav" aria-label="Guide and settings"><button disabled><Settings size={17} />Settings<span>Soon</span></button><Link href="/demo" className={pathname === "/demo" ? "is-active" : undefined} aria-current={pathname === "/demo" ? "page" : undefined} onClick={() => closeNavigation(mobileNav && pathname === "/demo")}><CircleHelp size={17} />Workspace guide</Link></nav>
        <div className="sidebar-account">
          <div className="sidebar-profile"><div aria-hidden="true">{initials}</div><p><b title={profileName}>{profileName}</b><span title={session?.user.email}>{session?.user.email}</span><span>{savingAvailable ? "Changes saved" : "Saving unavailable"}{mode === "mock" ? " · Demo" : ""}</span></p></div>
          <button type="button" className="sidebar-sign-out" disabled={signingOut} onClick={handleSignOut}><LogOut size={15} aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}</button>
          {signOutError && <p className="sidebar-auth-error" role="alert">{signOutError}</p>}
        </div>
      </aside>

      <main ref={contentRef} className="pennywise-content" aria-busy={!loaded}>
        <header className="dashboard-header">
          <div className="header-title"><button ref={menuButtonRef} className="mobile-menu icon-button" onClick={() => { closeNotifications(); setMobileNav(true); }} aria-expanded={mobileNav} aria-controls="workspace-navigation" aria-label="Open navigation"><Menu size={21} /></button><div><p className="eyebrow">Your workspace</p><h1 id="page-heading" tabIndex={-1}>{title} {pathname === "/" && <span aria-hidden="true">✦</span>}</h1></div></div>
          <div className="header-actions"><label className="currency-control">Displayed in <select aria-label="Reporting currency" value={currency} disabled={!loaded} onChange={event => { const nextCurrency = event.target.value; setState(current => ({ ...current, defaultCurrency: nextCurrency })); announce(`Figures displayed in ${nextCurrency}.`); }}>{SUPPORTED_REPORTING_CURRENCIES.map(item => <option key={item}>{item}</option>)}</select></label>
            <div className="notification-anchor"><button ref={bellRef} className="icon-button notification-button" aria-label={`Notifications, ${queue.total.count} pending transactions`} aria-expanded={notificationsOpen} aria-haspopup="dialog" aria-controls="notification-popup" disabled={!loaded} onClick={() => setNotificationsOpen(open => !open)}><Bell size={16} />{queue.total.count > 0 && <span>{queue.total.count}</span>}</button>
              {notificationsOpen && <div ref={notificationsRef} id="notification-popup" className="notification-popup" role="dialog" aria-labelledby="notification-heading">
                <div className="notification-popup__heading"><div><h2 id="notification-heading">Notifications</h2><p>{queue.total.count} pending · {sourceLabel}</p></div><button type="button" className="notification-close" aria-label="Close notifications" onClick={() => closeNotifications(true)}><X size={16} /></button></div>
                {queue.total.count === 0 ? <div className="notification-empty"><Check size={20} /><div><b>All caught up</b><p>No transactions are waiting for review in this source.</p></div></div> : <>
                  <div className="notification-summary"><div><b>{queue.ready.length}</b><span>Ready to confirm</span></div><div><b>{queue.needsAttention.length}</b><span>Need attention</span></div></div>
                  <div className="notification-previews">{previews.map(({ record, ready }) => {
                    const name = effectiveValues(record).merchantText ?? "Unlabelled activity";
                    const reason = ready ? "Ready to confirm" : attentionReasons(record, state.records)[0] ?? "Check details";
                    return <div key={record.id} className="notification-preview"><div><b>{name}</b><small>{reason}</small><span>{effectLabel(record, currency)}</span></div><div className="notification-preview__actions">{ready ? <button type="button" className="notification-quick-confirm" aria-label={`Confirm ${name}`} onClick={() => { confirmSelection([record.id]); requestAnimationFrame(() => notificationsRef.current?.querySelector<HTMLButtonElement>(".notification-quick-confirm, .notification-close")?.focus()); }}><Check size={12} />Confirm</button> : <Link href={`/review#review-record-${record.id}`} onClick={() => openReviewPreview(record.id)}>Review<ChevronRight size={12} /></Link>}</div></div>;
                  })}</div>
                </>}
                <Link className="notification-view-all" href="/review" onClick={() => closeNotifications()}>View all reviews<ChevronRight size={14} /></Link>
              </div>}
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  </div>;
}
