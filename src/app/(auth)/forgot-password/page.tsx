"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/update-password`,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      setError(
        msg.includes("too many")
          ? "Too many attempts. Please wait a few minutes and try again."
          : "Something went wrong. Please check your email address and try again."
      );
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Check your inbox</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          We sent a password reset link to <span className="font-medium text-ink">{email}</span>.
          Click it to choose a new password.
        </p>
        <p className="mt-6 text-xs text-muted">
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="eyebrow">Account access</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">
        Enter your email and we&apos;ll send a reset link.
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

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-accent underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
