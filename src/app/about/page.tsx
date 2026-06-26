import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "About — Ceylon Directory",
  description:
    "Ceylon Directory is Sri Lanka's trusted tourist-services directory. Every listing is manually reviewed by our team before it goes live.",
};

const STEPS = [
  {
    title: "Providers apply",
    body: "Business owners register and submit their listing with full contact details, description, pricing, and photos.",
  },
  {
    title: "Admin review",
    body: "Our team reviews every submission by hand. We check that the information is accurate, contact details are valid, and the service is genuine.",
  },
  {
    title: "Approval and publication",
    body: "Only listings that pass review go live. Ones that don't meet our standards are rejected with a note, so providers can fix and resubmit.",
  },
  {
    title: "Ongoing monitoring",
    body: "We monitor active listings and can deactivate any that slip below our standards. Providers can also request Featured or Sponsored placement to reach more travellers.",
  },
];

const PROMISES = [
  "Every listing you see has been checked by a real person — not just an algorithm.",
  "Contact details are verified so you can reach providers with confidence.",
  "Listings can be flagged and removed if they fall below our standards.",
  "No hidden fees for travellers — Ceylon Directory is free to browse.",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
      {/* Header */}
      <header className="max-w-2xl">
        <p className="eyebrow">About</p>
        <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-tight text-ink">
          A directory you can actually trust.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Ceylon Directory connects travellers with tourist services across Sri
          Lanka — from the south-coast beaches to the highlands of Nuwara Eliya,
          the Cultural Triangle, and the national parks. Finding a trustworthy
          guide or transfer in a new country shouldn&apos;t be a gamble, so every
          service here is reviewed and approved before it appears.
        </p>
      </header>

      {/* Verification steps — a real sequence, so numbered. */}
      <section className="mt-16 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">The process</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink">
            How verification works
          </h2>
          <p className="mt-3 text-muted">
            No automated approvals. A person checks every listing.
          </p>
        </div>
        <ol className="space-y-2">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-5 rounded-2xl border border-transparent p-4 transition-colors hover:border-hairline hover:bg-surface"
            >
              <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-on-brand">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* What this means for you */}
      <section className="mt-16 rounded-[1.5rem] border border-hairline bg-linen p-8 lg:p-10">
        <h2 className="text-xl font-bold text-ink">What this means for you</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {PROMISES.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-approved/15 text-approved">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="text-ink/90">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA band */}
      <section className="mt-16 flex flex-col gap-6 rounded-[1.5rem] bg-brand px-8 py-12 text-on-brand sm:flex-row sm:items-center sm:justify-between lg:px-12">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Ready to explore Sri Lanka?
          </h2>
          <p className="mt-2 text-[color-mix(in_srgb,var(--on-brand)_82%,transparent)]">
            Start with our verified listings, or add your own business.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/listings" className="btn btn-onbrand">
            Browse listings
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
          <Link
            href="/login"
            className="btn border border-current/30 text-on-brand hover:bg-white/10"
          >
            List your business
          </Link>
        </div>
      </section>
    </div>
  );
}
