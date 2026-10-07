import { AuthError, type AuthAdapter, type AuthFieldErrors, type AuthSession, type SignInInput, type SignUpInput } from "./types.ts";
import { normalizeEmail, validateSignIn, validateSignUp } from "./validation.ts";

function parseSession(value: unknown): AuthSession {
  if (typeof value !== "object" || value === null || !("user" in value)) throw new AuthError("invalid-response", "The sign-in service returned an unexpected response. Please try again.");
  const user = value.user;
  if (typeof user !== "object" || user === null || !("id" in user) || !("name" in user) || !("email" in user)
    || typeof user.id !== "string" || !user.id || typeof user.name !== "string" || !user.name || typeof user.email !== "string" || !user.email) {
    throw new AuthError("invalid-response", "The sign-in service returned an unexpected response. Please try again.");
  }
  return { user: { id: user.id, name: user.name, email: user.email } };
}

export function createApiAuthAdapter(fetcher: typeof fetch = (...args) => fetch(...args)): AuthAdapter {
  async function request(path: string, body?: SignInInput | SignUpInput): Promise<Response> {
    try {
      return await fetcher(`/api/auth/${path}`, {
        method: path === "session" ? "GET" : "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Accept": "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new AuthError("network", "Couldn't reach the sign-in service. Check your connection and try again.");
    }
  }

  async function checkResponse(response: Response): Promise<void> {
    if (response.ok) return;
    // Status-based messages avoid displaying untrusted server error text or internal details.
    if (response.status === 409) throw new AuthError("email-taken", "An account already uses this email. Sign in instead.", { email: "This email is already registered." });
    if (response.status === 401) throw new AuthError("invalid-credentials", "That email and password don't match. Please try again.");
    if (response.status === 429) throw new AuthError("unavailable", "Too many attempts. Wait a moment and try again.");
    throw new AuthError("unavailable", "The sign-in service is unavailable. Please try again.");
  }

  async function sessionResponse(response: Response): Promise<AuthSession> {
    await checkResponse(response);
    let value: unknown;
    try { value = await response.json(); }
    catch { throw new AuthError("invalid-response", "The sign-in service returned an unexpected response. Please try again."); }
    return parseSession(value);
  }

  function validate(errors: AuthFieldErrors): void {
    if (Object.keys(errors).length) throw new AuthError("validation", "Check your account details.", errors);
  }

  return {
    async getSession() {
      const response = await request("session");
      if (response.status === 401) return null;
      await checkResponse(response);
      let value: unknown;
      try { value = await response.json(); }
      catch { throw new AuthError("invalid-response", "The sign-in service returned an unexpected response. Please try again."); }
      return value === null ? null : parseSession(value);
    },
    async signIn(input) {
      validate(validateSignIn(input));
      return sessionResponse(await request("login", { ...input, email: normalizeEmail(input.email) }));
    },
    async signUp(input) {
      validate(validateSignUp(input));
      return sessionResponse(await request("signup", { ...input, name: input.name.trim(), email: normalizeEmail(input.email), rememberMe: input.rememberMe ?? false }));
    },
    async signOut() {
      await checkResponse(await request("logout"));
    },
  };
}
