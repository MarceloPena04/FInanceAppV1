"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "../auth/provider";
import { DEMO_USER } from "../auth/mock-adapter";
import { AppShell } from "./app-shell";
import { DemoProvider } from "./demo-provider";
import { STORAGE_KEY } from "./demo-utils";
import "./auth-boundary.css";

const workspaceRoutes = new Set(["/", "/transactions", "/review", "/reports", "/demo"]);

export function AuthBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, status, mode } = useAuth();
  const isWorkspace = workspaceRoutes.has(pathname);

  useEffect(() => {
    if (!isWorkspace || status !== "unauthenticated") return;
    const returnTo = `${pathname}${window.location.search}${window.location.hash}`;
    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [isWorkspace, pathname, router, status]);

  if (!isWorkspace) return children;
  if (status !== "authenticated" || !session) {
    return <main className="auth-loading" aria-busy="true">
      <span className="brand-mark"><Sparkles size={20} aria-hidden="true" /></span>
      <p role="status">{status === "loading" ? "Opening your workspace…" : "Taking you to sign in…"}</p>
    </main>;
  }

  // Remount on account changes so decisions cannot carry into another account.
  const storageKey = mode === "mock" && session.user.id === DEMO_USER.id
    ? STORAGE_KEY // Keep the existing demo decisions available through demo sign-in.
    : `${STORAGE_KEY}:${session.user.id}`;
  return <DemoProvider key={session.user.id} storageKey={storageKey}><AppShell>{children}</AppShell></DemoProvider>;
}
