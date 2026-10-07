import { AuthError, type AuthAdapter, type AuthSession, type AuthUser, type SignInInput, type SignUpInput } from "./types.ts";
import { normalizeEmail, validateSignIn, validateSignUp } from "./validation.ts";

export const AUTH_STORAGE_KEYS = {
  accounts: "finance-auth-accounts-v1",
  rememberedSession: "finance-auth-remembered-session-v1",
  session: "finance-auth-session-v1",
} as const;

export const DEMO_CREDENTIALS = { email: "demo@finance.app", password: "Demo1234!" } as const;
export const DEMO_USER: AuthUser = { id: "finance-demo-user", name: "Demo User", email: DEMO_CREDENTIALS.email };

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface MockAuthOptions {
  localStorage?: StorageLike;
  sessionStorage?: StorageLike;
  crypto?: Crypto;
}

interface MockAccount {
  user: AuthUser;
  salt: string;
  passwordHash: string;
}

const HASH_ITERATIONS = 100_000;
const STORAGE_MESSAGE = "Browser storage is unavailable. Allow storage for this site and try again.";
const CORRUPT_MESSAGE = "Saved test accounts could not be read. Clear this site's browser storage to start fresh.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUser(value: unknown): value is AuthUser {
  return isRecord(value) && typeof value.id === "string" && !!value.id && value.id.length <= 128
    && typeof value.name === "string" && value.name.trim().length >= 2 && value.name.length <= 80
    && typeof value.email === "string" && normalizeEmail(value.email) === value.email
    && !validateSignIn({ email: value.email, password: "present", rememberMe: false }).email;
}

function isAccount(value: unknown): value is MockAccount {
  return isRecord(value) && isUser(value.user)
    && typeof value.salt === "string" && /^[a-f0-9]{32}$/.test(value.salt)
    && typeof value.passwordHash === "string" && /^[a-f0-9]{64}$/.test(value.passwordHash);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string, crypto: Crypto): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const saltBytes = new Uint8Array(salt.match(/.{2}/g)!.map(byte => Number.parseInt(byte, 16)));
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: HASH_ITERATIONS, hash: "SHA-256" }, key, 256);
  return bytesToHex(new Uint8Array(hash));
}

// This adapter is browser-only test functionality; it never establishes server authorization.
export function createMockAuthAdapter(options: MockAuthOptions = {}): AuthAdapter {
  function storages(): { local: StorageLike; tab: StorageLike } {
    try {
      const local = options.localStorage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
      const tab = options.sessionStorage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
      if (!local || !tab) throw new AuthError("storage-unavailable", STORAGE_MESSAGE);
      return { local, tab };
    } catch {
      throw new AuthError("storage-unavailable", STORAGE_MESSAGE);
    }
  }

  function read(storage: StorageLike, key: string): string | null {
    try { return storage.getItem(key); }
    catch { throw new AuthError("storage-unavailable", STORAGE_MESSAGE); }
  }

  function write(storage: StorageLike, key: string, value: string | null): void {
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch { throw new AuthError("storage-unavailable", STORAGE_MESSAGE); }
  }

  function readAccounts(local: StorageLike): MockAccount[] {
    const raw = read(local, AUTH_STORAGE_KEYS.accounts);
    if (raw === null) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.accounts) || !parsed.accounts.every(isAccount)) throw new Error("Invalid accounts");
      const accounts: MockAccount[] = parsed.accounts;
      if (new Set(accounts.map(account => account.user.email)).size !== accounts.length || new Set(accounts.map(account => account.user.id)).size !== accounts.length
        || accounts.some(account => account.user.email === DEMO_USER.email || account.user.id === DEMO_USER.id)) throw new Error("Duplicate account");
      return accounts;
    } catch { throw new AuthError("corrupt-storage", CORRUPT_MESSAGE); }
  }

  function getCrypto(): Crypto {
    const crypto = options.crypto ?? globalThis.crypto;
    if (!crypto?.subtle || !crypto.getRandomValues || !crypto.randomUUID) {
      throw new AuthError("unavailable", "Secure browser features are unavailable. Open this app on localhost or HTTPS and try again.");
    }
    return crypto;
  }

  function saveSession(user: AuthUser, rememberMe: boolean): AuthSession {
    const { local, tab } = storages();
    const previousLocal = read(local, AUTH_STORAGE_KEYS.rememberedSession);
    const previousTab = read(tab, AUTH_STORAGE_KEYS.session);
    try {
      write(local, AUTH_STORAGE_KEYS.rememberedSession, null);
      write(tab, AUTH_STORAGE_KEYS.session, null);
      write(rememberMe ? local : tab, rememberMe ? AUTH_STORAGE_KEYS.rememberedSession : AUTH_STORAGE_KEYS.session, JSON.stringify({ version: 1, userId: user.id }));
    } catch (error) {
      // Restore the prior login if switching session persistence fails.
      try { write(local, AUTH_STORAGE_KEYS.rememberedSession, previousLocal); } catch { /* Original storage error is reported. */ }
      try { write(tab, AUTH_STORAGE_KEYS.session, previousTab); } catch { /* Original storage error is reported. */ }
      throw error;
    }
    return { user: { ...user } };
  }

  return {
    async getSession() {
      const { local, tab } = storages();
      for (const [storage, key] of [[tab, AUTH_STORAGE_KEYS.session], [local, AUTH_STORAGE_KEYS.rememberedSession]] as const) {
        const raw = read(storage, key);
        if (raw === null) continue;
        let userId: string | undefined;
        try {
          const value: unknown = JSON.parse(raw);
          if (isRecord(value) && value.version === 1 && typeof value.userId === "string") userId = value.userId;
        } catch { /* Invalid sessions are safely discarded below. */ }
        if (userId) {
          const user = userId === DEMO_USER.id ? DEMO_USER : readAccounts(local).find(account => account.user.id === userId)?.user;
          if (user) return { user: { ...user } };
        }
        write(storage, key, null);
      }
      return null;
    },

    async signIn(input: SignInInput) {
      const errors = validateSignIn(input);
      if (Object.keys(errors).length) throw new AuthError("validation", "Check your email and password.", errors);
      const email = normalizeEmail(input.email);
      if (email === DEMO_CREDENTIALS.email && input.password === DEMO_CREDENTIALS.password) return saveSession(DEMO_USER, input.rememberMe);
      const { local } = storages();
      const account = readAccounts(local).find(account => account.user.email === email);
      if (!account || await hashPassword(input.password, account.salt, getCrypto()) !== account.passwordHash) {
        throw new AuthError("invalid-credentials", "That email and password don't match. Please try again.");
      }
      return saveSession(account.user, input.rememberMe);
    },

    async signUp(input: SignUpInput) {
      const errors = validateSignUp(input);
      if (Object.keys(errors).length) throw new AuthError("validation", "Check your account details.", errors);
      const email = normalizeEmail(input.email);
      const { local } = storages();
      const taken = (accounts: MockAccount[]) => email === DEMO_CREDENTIALS.email || accounts.some(account => account.user.email === email);
      if (taken(readAccounts(local))) throw new AuthError("email-taken", "An account already uses this email. Sign in instead.", { email: "This email is already registered." });
      const crypto = getCrypto();
      const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
      const passwordHash = await hashPassword(input.password, salt, crypto);
      // Re-read after hashing so other registrations in this browser are retained.
      const accounts = readAccounts(local);
      if (taken(accounts)) throw new AuthError("email-taken", "An account already uses this email. Sign in instead.", { email: "This email is already registered." });
      const user = { id: crypto.randomUUID(), name: input.name.trim(), email };
      const previousAccounts = read(local, AUTH_STORAGE_KEYS.accounts);
      write(local, AUTH_STORAGE_KEYS.accounts, JSON.stringify({ version: 1, accounts: [...accounts, { user, salt, passwordHash }] }));
      try { return saveSession(user, input.rememberMe ?? false); }
      catch (error) {
        try { write(local, AUTH_STORAGE_KEYS.accounts, previousAccounts); } catch { /* Report that registration could not finish. */ }
        throw error;
      }
    },

    async signOut() {
      const { local, tab } = storages();
      // Try both stores even if clearing one fails; success is reported only when both clear.
      let failure: unknown;
      for (const [storage, key] of [[local, AUTH_STORAGE_KEYS.rememberedSession], [tab, AUTH_STORAGE_KEYS.session]] as const) {
        try { write(storage, key, null); } catch (error) { failure = error; }
      }
      if (failure) throw failure;
    },
  };
}
