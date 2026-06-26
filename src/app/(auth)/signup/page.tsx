"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MailCheck, UserCheck } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      setError(
        msg.includes("already registered") || msg.includes("user already")
          ? "An account with this email already exists. Try signing in instead."
          : msg.includes("password should be") || msg.includes("password must")
          ? "Password must be at least 8 characters."
          : msg.includes("invalid format") || msg.includes("invalid email")
          ? "Please enter a valid email address."
          : msg.includes("too many")
          ? "Too many attempts. Please wait a few minutes and try again."
          : error.message
      );
      setLoading(false);
      return;
    }

    // Detect the three outcomes from signUp:
    // 1. Duplicate: user exists with empty identities (no session)
    // 2. Needs confirmation: no session but not duplicate
    // 3. Signed in: session present
    const isDuplicate = data.user?.identities?.length === 0;
    const requiresConfirmation = !data.session && !isDuplicate;

    setSuccess(true);
    setIsDuplicate(isDuplicate);
    setNeedsConfirmation(requiresConfirmation);
    setLoading(false);
  }

  if (success) {
    const SuccessIcon = isDuplicate
      ? UserCheck
      : needsConfirmation
      ? MailCheck
      : CheckCircle2;
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <SuccessIcon className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {isDuplicate ? "Account already exists" : needsConfirmation ? "Check your email" : "You're in"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {isDuplicate
            ? "An account with this email already exists. Sign in instead."
            : needsConfirmation
            ? "We've sent a confirmation link to your inbox. Click it to activate your account."
            : "Your account is ready. Head to your dashboard to get started."}
        </p>
        {isDuplicate && (
          <Link href="/login" className="btn btn-primary mt-6">
            Sign in
          </Link>
        )}
        {!isDuplicate && !needsConfirmation && (
          <Link href="/dashboard" className="btn btn-primary mt-6">
            Go to dashboard
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <p className="eyebrow">Get started</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
        Create an account
      </h1>
      <p className="mt-2 text-sm text-muted">
        Add your Sri Lanka tourist service and reach travellers planning their trip.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-rejected/30 bg-rejected/10 px-4 py-3 text-sm text-rejected"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-ink">
            Full name
          </label>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className="field disabled:opacity-50"
            placeholder="Amara Perera"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="field disabled:opacity-50"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="field disabled:opacity-50"
            placeholder="Min. 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
