import { createApiAuthAdapter } from "./api-adapter.ts";
import { createMockAuthAdapter } from "./mock-adapter.ts";
import type { AuthAdapter } from "./types.ts";

// NEXT_PUBLIC values are substituted when Next.js builds the browser bundle.
export const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE === "api" ? "api" : "mock";

export const authClient: AuthAdapter = AUTH_MODE === "api" ? createApiAuthAdapter() : createMockAuthAdapter();
