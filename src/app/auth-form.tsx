"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, Eye, EyeOff, LoaderCircle, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "../auth/provider";
import { DEMO_CREDENTIALS } from "../auth/mock-adapter";
import { AuthError, getAuthErrorMessage } from "../auth/types";
import { safeReturnTo, validateSignIn, validateSignUp } from "../auth/validation";
import "./auth.css";

type AuthVariant = "login" | "signup";
type FieldName = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;
const fieldOrder: FieldName[] = ["name", "email", "password", "confirmPassword"];

function AuthLayout({ variant, children, switchLink }: { variant: AuthVariant; children: ReactNode; switchLink?: ReactNode }) {
  return <main className="auth-page">
    <a className="skip-link" href="#page-heading">Skip to {variant === "login" ? "log in" : "sign up"}</a>
    <div className="auth-page__inner">
      <header className="auth-header">
        <Link href="/login" className="auth-brand" aria-label="Pennywise home"><span className="auth-brand__mark"><Sparkles size={19} aria-hidden="true" /></span><span>pennywise</span></Link>
        <div className="auth-switch">{switchLink ?? <><span>{variant === "login" ? "New to Pennywise?" : "Already have an account?"}</span><Link href={variant === "login" ? "/signup" : "/login"}>{variant === "login" ? "Create an account" : "Log in"}<ArrowRight size={14} aria-hidden="true" /></Link></>}</div>
      </header>
      <div className="auth-grid">
        <aside className="auth-story" aria-labelledby="auth-story-heading">
          <p className="auth-story__eyebrow"><span aria-hidden="true" />A little clarity, every day</p>
          <h2 id="auth-story-heading">Your money.<br />A clearer picture.</h2>
          <p className="auth-story__intro">Less guesswork. More peace of mind. Bring your cash flow, transactions, and everyday decisions into focus.</p>
          <div className="auth-preview" aria-label="Illustration of sample cash flow">
            <div className="auth-preview__top"><p>Sample cash flow<span>This week</span></p><span className="auth-preview__badge"><span aria-hidden="true" />In view</span></div>
            <p className="auth-preview__balance">$1,240<span>.00</span><ArrowUpRight size={20} aria-hidden="true" /></p>
            <p className="auth-preview__caption">A little more breathing room.</p>
            <div className="auth-preview__chart" aria-hidden="true">
              {[{ a: 30, b: 20 }, { a: 54, b: 34 }, { a: 39, b: 27 }, { a: 76, b: 44 }, { a: 56, b: 29 }, { a: 88, b: 45 }, { a: 65, b: 32 }].map((day, index) => <div key={index}><span style={{ height: `${day.a}%` }} /><span style={{ height: `${day.b}%` }} /><small>{["M", "T", "W", "T", "F", "S", "S"][index]}</small></div>)}
            </div>
            <div className="auth-preview__totals"><p><span><ArrowUpRight size={14} aria-hidden="true" />Money in</span><b>$2,480.00</b></p><p><span><ArrowDownLeft size={14} aria-hidden="true" />Money out</span><b>$1,240.00</b></p></div>
          </div>
          <div className="auth-story__note"><span><Check size={15} aria-hidden="true" /></span><p>A clear view, one small step at a time.</p></div>
          <span className="auth-story__decoration" aria-hidden="true">✦</span>
        </aside>
        <section className="auth-panel" aria-labelledby="page-heading">{children}</section>
      </div>
      <footer className="auth-footer"><span>© {new Date().getFullYear()} Pennywise</span><span>Make room for what matters.</span></footer>
    </div>
  </main>;
}

export function AuthPageFallback({ variant }: { variant: AuthVariant }) {
  return <AuthLayout variant={variant}><div className="auth-heading"><p className="auth-eyebrow">Your next step starts here</p><h1 id="page-heading" tabIndex={-1}>{variant === "login" ? "Welcome back." : "Make yourself at home."}</h1><p>{variant === "login" ? "Log in for a clearer view of your money." : "A fresh start for your everyday finances."}</p></div><div className="auth-form-loading" role="status"><LoaderCircle size={20} aria-hidden="true" />Getting things ready…</div></AuthLayout>;
}

export function AuthForm({ variant }: { variant: AuthVariant }) {
  const signup = variant === "signup";
  const { session, status, mode, error: sessionError, signIn, signUp, signOut } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const destination = safeReturnTo(searchParams.get("returnTo"));
  const switchHref = `${signup ? "/login" : "/signup"}${searchParams.has("returnTo") ? `?returnTo=${encodeURIComponent(destination)}` : ""}`;
  const [values, setValues] = useState({ name: "", email: "", password: "", confirmPassword: "", rememberMe: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pending, setPending] = useState<"submit" | "signout" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const busy = pending !== null || status === "loading";
  const topError = formError ?? sessionError;

  function updateValue(field: FieldName, value: string) {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function focusInvalid(nextErrors: FieldErrors) {
    const firstField = fieldOrder.find(field => nextErrors[field]);
    requestAnimationFrame(() => {
      if (!firstField) return;
      const control = formRef.current?.elements.namedItem(firstField);
      if (control instanceof HTMLElement) control.focus();
    });
  }

  async function runAction(action: "submit" | "signout", operation: () => Promise<void>) {
    if (inFlight.current || status === "loading") return;
    inFlight.current = true;
    setPending(action);
    setFormError(null);
    try {
      await operation();
      if (action !== "signout") router.replace(destination);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
      const serverErrors = error instanceof AuthError && action === "submit"
        ? Object.fromEntries(Object.entries(error.fieldErrors).filter(([field, message]) => message && (signup || field === "email" || field === "password"))) as FieldErrors
        : {};
      if (Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors);
        focusInvalid(serverErrors);
      } else {
        requestAnimationFrame(() => errorRef.current?.focus());
      }
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const nextErrors: FieldErrors = signup ? validateSignUp(values) : validateSignIn(values);
    if (signup && values.password !== values.confirmPassword) nextErrors.confirmPassword = "Your passwords don’t match.";
    if (signup && !values.confirmPassword) nextErrors.confirmPassword = "Confirm your password.";
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) {
      focusInvalid(nextErrors);
      return;
    }
    void runAction("submit", () => signup
      ? signUp({ name: values.name.trim(), email: values.email.trim(), password: values.password, rememberMe: false })
      : signIn({ email: values.email.trim(), password: values.password, rememberMe: values.rememberMe }));
  }

  function passwordField(confirm = false) {
    const field = confirm ? "confirmPassword" : "password";
    const visible = confirm ? showConfirmPassword : showPassword;
    const help = signup && !confirm ? "auth-password-help" : undefined;
    const error = errors[field];
    return <div className="auth-field">
      <label htmlFor={`auth-${field}`}>{confirm ? "Confirm password" : "Password"}</label>
      <div className="auth-password" data-invalid={Boolean(error)}>
        <input id={`auth-${field}`} name={field} type={visible ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} placeholder={confirm ? "Enter your password again" : signup ? "Create a password" : "Enter your password"} value={values[field]} onChange={event => updateValue(field, event.target.value)} required maxLength={128} aria-invalid={Boolean(error)} aria-describedby={[help, error ? `auth-${field}-error` : null].filter(Boolean).join(" ") || undefined} />
        <button type="button" className="auth-password__toggle" onClick={() => confirm ? setShowConfirmPassword(value => !value) : setShowPassword(value => !value)} aria-label={`${visible ? "Hide" : "Show"} ${confirm ? "confirm password" : "password"}`} aria-pressed={visible}>{visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button>
      </div>
      {help && <p id={help} className="auth-field__help">8–128 characters, including a letter and a number.</p>}
      {error && <p id={`auth-${field}-error`} className="auth-field__error">{error}</p>}
    </div>;
  }

  return <AuthLayout variant={variant} switchLink={<><span>{signup ? "Already have an account?" : "New to Pennywise?"}</span><Link href={switchHref}>{signup ? "Log in" : "Create an account"}<ArrowRight size={14} aria-hidden="true" /></Link></>}>
    <div className="auth-heading"><p className="auth-eyebrow">{signup ? "A fresh start" : "A moment for your money"}</p><h1 id="page-heading" tabIndex={-1}>{session ? "You’re right at home." : signup ? "Make yourself at home." : "Welcome back."}</h1><p>{session ? `You’re logged in as ${session.user.name}.` : signup ? "Create an account and find your financial rhythm." : "Log in for a clearer view of your money."}</p></div>
    {topError && <div ref={errorRef} className="auth-error" role="alert" tabIndex={-1}>{topError}</div>}
    {session ? <div className="auth-session"><div className="auth-session__user"><span><Check size={20} aria-hidden="true" /></span><div><b>Your workspace is ready</b><p>{session.user.email}</p></div></div><Link className="auth-primary" href={destination}>Open your workspace<ArrowRight className="auth-primary__arrow" size={17} aria-hidden="true" /></Link><button type="button" className="auth-session__signout" disabled={busy} onClick={() => void runAction("signout", signOut)}>{pending === "signout" ? <LoaderCircle className="auth-spin" size={15} aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}{pending === "signout" ? "Logging out…" : "Log out and use another account"}</button></div> : <>
      <form ref={formRef} className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
        <fieldset disabled={busy} className="auth-fields"><legend className="auth-visually-hidden">{signup ? "Create your account" : "Log in to your account"}</legend>
          {signup && <div className="auth-field"><label htmlFor="auth-name">Your name</label><input id="auth-name" name="name" autoComplete="name" placeholder="e.g. Alex Morgan" value={values.name} onChange={event => updateValue("name", event.target.value)} required maxLength={80} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "auth-name-error" : undefined} />{errors.name && <p id="auth-name-error" className="auth-field__error">{errors.name}</p>}</div>}
          <div className="auth-field"><label htmlFor="auth-email">Email address</label><input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={values.email} onChange={event => updateValue("email", event.target.value)} required maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "auth-email-error" : undefined} />{errors.email && <p id="auth-email-error" className="auth-field__error">{errors.email}</p>}</div>
          {passwordField()}
          {signup ? passwordField(true) : <label className="auth-remember"><input name="rememberMe" type="checkbox" checked={values.rememberMe} onChange={event => setValues(current => ({ ...current, rememberMe: event.target.checked }))} /><span>Keep me logged in on this device</span></label>}
          <button className="auth-primary" type="submit">{pending === "submit" || status === "loading" ? <><LoaderCircle className="auth-spin" size={17} aria-hidden="true" />{status === "loading" ? "Getting things ready…" : signup ? "Creating your account…" : "Logging in…"}</> : <>{signup ? "Create account" : "Log in"}<ArrowRight className="auth-primary__arrow" size={17} aria-hidden="true" /></>}</button>
        </fieldset>
      </form>
      {mode === "mock" && <div className="auth-demo__note">
        <span className="auth-demo__label">Preview mode</span>
        <p>Use a test account on this device. All balances and transactions are sample data.</p>
        <details><summary>View demo login details</summary><dl><div><dt>Email</dt><dd>{DEMO_CREDENTIALS.email}</dd></div><div><dt>Password</dt><dd>{DEMO_CREDENTIALS.password}</dd></div></dl></details>
      </div>}
      <p className="auth-mobile-switch">{signup ? "Already have an account?" : "New to Pennywise?"} <Link href={switchHref}>{signup ? "Log in" : "Create an account"}</Link></p>
    </>}
  </AuthLayout>;
}
