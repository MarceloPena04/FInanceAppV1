export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
}

export interface SignInInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  rememberMe?: boolean;
}

export type AuthFieldErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;

export interface AuthAdapter {
  getSession(): Promise<AuthSession | null>;
  signIn(input: SignInInput): Promise<AuthSession>;
  signUp(input: SignUpInput): Promise<AuthSession>;
  signOut(): Promise<void>;
}

export type AuthErrorCode = "validation" | "invalid-credentials" | "email-taken" | "storage-unavailable" | "corrupt-storage" | "unavailable" | "network" | "invalid-response";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly fieldErrors: AuthFieldErrors;

  constructor(code: AuthErrorCode, message: string, fieldErrors: AuthFieldErrors = {}) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function getAuthErrorMessage(error: unknown): string {
  return error instanceof AuthError ? error.message : "Something went wrong. Please try again.";
}
