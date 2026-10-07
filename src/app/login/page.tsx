import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthPageFallback } from "../auth-form";

export const metadata: Metadata = {
  title: "Log in · Pennywise",
  description: "Log in to your Pennywise workspace for a clearer view of your money.",
};

export default function LoginPage() {
  return <Suspense fallback={<AuthPageFallback variant="login" />}><AuthForm variant="login" /></Suspense>;
}
