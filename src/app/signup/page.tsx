import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthPageFallback } from "../auth-form";

export const metadata: Metadata = {
  title: "Create an account · Pennywise",
  description: "Create your Pennywise account and start making sense of your cash flow.",
};

export default function SignupPage() {
  return <Suspense fallback={<AuthPageFallback variant="signup" />}><AuthForm variant="signup" /></Suspense>;
}
