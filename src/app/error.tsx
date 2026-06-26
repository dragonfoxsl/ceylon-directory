"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-28 text-center">
      <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-rejected/10 text-rejected">
        <AlertTriangle className="h-7 w-7" strokeWidth={1.5} />
      </span>

      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">
        We hit an unexpected error.
      </h1>
      <p className="mt-3 text-muted">
        This has been noted. Try refreshing the page — it usually clears up on
        its own.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-secondary">
          Go to homepage
        </Link>
      </div>

      {error.digest && (
        <p className="num mt-6 text-xs text-muted">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
