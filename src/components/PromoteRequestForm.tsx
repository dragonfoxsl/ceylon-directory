"use client";

import { useActionState } from "react";
import type { PromotionResult } from "@/actions/promotion";

type Props = {
  action: (prev: PromotionResult | null, data: FormData) => Promise<PromotionResult>;
};

export function PromoteRequestForm({ action }: Props) {
  const [state, formAction, pending] = useActionState<PromotionResult | null, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="mt-5 flex flex-col items-center gap-3">
      {state && !state.ok && (
        <p role="alert" className="text-sm text-rejected">
          {state.message ?? "Something went wrong. Please try again."}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Submitting…" : "I’ve paid — request promotion"}
      </button>
    </form>
  );
}
