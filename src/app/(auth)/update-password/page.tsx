"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      const msg = error.message.toLowerCase();
      setError(
        msg.includes("same password")
          ? "Your new password must be different from your current one."
          : msg.includes("weak")
          ? "Please choose a stronger password."
          : "Something went wrong. Please try again."
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <p className="eyebrow">Account access</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted">
        Pick something strong — at least 8 characters.
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
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
            New password
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

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-ink">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            className="field disabled:opacity-50"
            placeholder="Repeat your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving…" : "Set new password"}
        </button>
      </form>
    </>
  );
}
