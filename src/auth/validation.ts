import type { AuthFieldErrors, SignInInput, SignUpInput } from "./types.ts";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateEmail(email: string): string | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized) return "Enter your email address.";
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return "Enter a valid email address.";
}

export function validateSignIn(input: SignInInput): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  if (!input.password) errors.password = "Enter your password.";
  return errors;
}

export function validateSignUp(input: SignUpInput): AuthFieldErrors {
  const errors = validateSignIn({ ...input, rememberMe: input.rememberMe ?? false });
  const name = input.name.trim();
  if (name.length < 2) errors.name = "Enter at least 2 characters for your name.";
  else if (name.length > 80) errors.name = "Keep your name under 80 characters.";
  if (input.password && (input.password.length < 8 || input.password.length > 128 || !/[a-z]/i.test(input.password) || !/\d/.test(input.password))) {
    errors.password = "Use 8–128 characters, including a letter and a number.";
  }
  return errors;
}

const WORKSPACE_ROUTES = new Set(["/", "/transactions", "/review", "/reports", "/demo"]);

// Only exact workspace destinations may be restored after signing in.
export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return "/";
  try {
    const destination = new URL(value, "https://finance.invalid");
    if (destination.origin !== "https://finance.invalid" || !WORKSPACE_ROUTES.has(destination.pathname)) return "/";
    // Reject encoded separators or control characters even if a browser currently retains them.
    if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(destination.pathname))) return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}
