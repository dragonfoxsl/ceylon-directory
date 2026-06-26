import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Eye, Plus, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Email confirmed — Ceylon Directory",
  description: "Your account is confirmed. Add your first listing to reach travellers.",
};

const STEPS = [
  {
    Icon: Plus,
    label: "Add your listing",
    desc: "Fill in your service details, photos, and contact info. Takes about five minutes.",
  },
  {
    Icon: Clock,
    label: "We review it",
    desc: "A real person checks every listing before it goes live — usually within 24 hours.",
  },
  {
    Icon: Eye,
    label: "Travellers find you",
    desc: "Your service appears in search results, category pages, and on the map.",
  },
  {
    Icon: Sparkles,
    label: "Boost visibility",
    desc: "Once live, you can request Featured or Sponsored placement to appear at the top of results.",
  },
];

export default function ConfirmedPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      {/* Icon */}
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-approved/10 text-approved">
        <CheckCircle2 className="h-8 w-8" strokeWidth={1.75} />
      </span>

      {/* Headline */}
      <h1 className="mt-6 text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-tight text-ink">
        Your email is confirmed.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-lg text-muted">
        Welcome to Ceylon Directory. Here&apos;s how to get your service in front of
        travellers planning their Sri Lanka trip.
      </p>

      {/* Steps */}
      <ol className="mt-10 grid gap-4 text-left sm:grid-cols-2">
        {STEPS.map(({ Icon, label, desc }, i) => (
          <li
            key={label}
            className="card flex flex-col gap-3 p-5"
          >
            <div className="flex items-center gap-3">
              <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-brand">
                {i + 1}
              </span>
              <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
            </div>
            <p className="font-semibold text-ink">{label}</p>
            <p className="text-sm leading-relaxed text-muted">{desc}</p>
          </li>
        ))}
      </ol>

      {/* CTA */}
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href="/dashboard/new" className="btn btn-primary">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add your first listing
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
        <Link href="/dashboard" className="btn btn-secondary">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
