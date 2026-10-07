"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { authClient, AUTH_MODE } from "./client";
import { AUTH_STORAGE_KEYS } from "./mock-adapter";
import type { AuthAdapter, AuthSession, SignInInput, SignUpInput } from "./types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
interface AuthContextValue {
  session: AuthSession | null;
  status: AuthStatus;
  mode: "mock" | "api";
  error: string | null;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Auth components must be inside AuthProvider.");
  return context;
}

// UI depends on this contract; persistence and requests live in the adapter.
export function AuthProvider({ children, adapter = authClient }: { children: ReactNode; adapter?: AuthAdapter }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const operationPending = useRef(false);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (operationPending.current) return;
      const current = ++revision.current;
      try {
        const restored = await adapter.getSession();
        if (!active || current !== revision.current) return;
        setSession(restored);
        setStatus(restored ? "authenticated" : "unauthenticated");
        setError(null);
      } catch {
        if (!active || current !== revision.current) return;
        setSession(null);
        setStatus("unauthenticated");
        setError("We couldn’t restore your session. Please sign in again.");
      }
    };
    void restore();
    // Remembered mock sessions can be changed by another browser tab.
    const sync = (event: StorageEvent) => {
      if (AUTH_MODE !== "mock") return;
      if (event.key === null || event.key === AUTH_STORAGE_KEYS.rememberedSession || event.key === AUTH_STORAGE_KEYS.session) void restore();
    };
    window.addEventListener("storage", sync);
    return () => { active = false; window.removeEventListener("storage", sync); };
  }, [adapter]);

  const authenticate = async (operation: () => Promise<AuthSession>) => {
    if (operationPending.current) throw new Error("Please wait for the current sign-in request.");
    operationPending.current = true;
    const current = ++revision.current;
    try {
      const next = await operation();
      if (current !== revision.current) return;
      setSession(next);
      setStatus("authenticated");
      setError(null);
    } finally {
      operationPending.current = false;
    }
  };

  const signOut = async () => {
    if (operationPending.current) throw new Error("Please wait for the current sign-in request.");
    operationPending.current = true;
    const current = ++revision.current;
    try {
      await adapter.signOut();
      if (current !== revision.current) return;
      setSession(null);
      setStatus("unauthenticated");
      setError(null);
    } finally {
      operationPending.current = false;
    }
  };

  return <AuthContext.Provider value={{
    session, status, mode: AUTH_MODE, error,
    signIn: input => authenticate(() => adapter.signIn(input)),
    signUp: input => authenticate(() => adapter.signUp(input)),
    signOut,
  }}>{children}</AuthContext.Provider>;
}
