import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Info,
  Landmark,
  Megaphone,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { getPromotionPaymentConfig } from "@/lib/promotion-config";
import { requestSponsorship } from "@/actions/promotion";
import { SponsorRequestForm } from "@/components/SponsorRequestForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SponsorListingPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createServerClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, title, is_sponsored, sponsored_until, sponsored_requested_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !listing) {
    notFound();
  }

  const now = new Date();
  const isSponsored =
    listing.is_sponsored &&
    listing.sponsored_until &&
    new Date(listing.sponsored_until) > now;

  const alreadyRequested = !!listing.sponsored_requested_at;
  const payment = getPromotionPaymentConfig();

  async function handleRequestSponsorship(_prev: unknown, _data: FormData) {
    "use server";
    return requestSponsorship(id);
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-sm text-muted"
      >
        <Link href="/dashboard" className="transition-colors hover:text-accent">
          My listings
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        <span className="inline-block max-w-[180px] truncate align-bottom font-medium text-ink">
          {listing.title}
        </span>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        <span className="font-medium text-ink">Sponsored placement</span>
      </nav>

      <p className="eyebrow mt-6 flex items-center gap-2">
        <Megaphone className="h-3.5 w-3.5 text-brand" strokeWidth={2.5} />
        Sponsored listing
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
        Get sponsored placement
      </h1>
      <p className="mt-2 text-sm text-muted">
        Reach more travellers by appearing at the very top of every relevant results page.
      </p>

      {/* What you get */}
      <div className="mt-8 rounded-[1.5rem] border border-brand/30 bg-brand/[0.06] px-6 py-5">
        <h2 className="text-base font-semibold text-ink">
          What sponsored placement includes
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm text-ink/90">
          {[
            "Priority position above all featured and regular listings",
            "A prominent Sponsored banner across the top of your listing card",
            "A sponsored chip on your listing detail page with a disclosure notice",
            "Included in all relevant category, region, and search results",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-start gap-2 border-t border-brand/20 pt-4 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand/60" strokeWidth={2} />
          <span>
            Sponsored listings are clearly disclosed to travellers. All listings — sponsored or
            not — meet the same verification standards.
          </span>
        </div>
      </div>

      {/* State: currently sponsored */}
      {isSponsored ? (
        <div className="card mt-8 px-6 py-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Megaphone className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="mt-3 text-lg font-semibold text-ink">Currently sponsored</p>
          <p className="mt-1 text-sm text-muted">
            Your listing is sponsored until{" "}
            <span className="num font-medium text-ink">
              {fmtDate(listing.sponsored_until!)}
            </span>
            .
          </p>
        </div>
      ) : alreadyRequested ? (
        /* State: request submitted, awaiting admin */
        <div className="card mt-8 px-6 py-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pending/15 text-pending">
            <Clock className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="mt-3 text-lg font-semibold text-ink">
            Sponsorship requested
          </p>
          <p className="mt-1 text-sm text-muted">
            Requested on{" "}
            <span className="num font-medium text-ink">
              {fmtDate(listing.sponsored_requested_at!)}
            </span>
            . We&apos;ll activate your sponsored placement after confirming payment.
          </p>
        </div>
      ) : (
        /* State: not yet requested */
        <>
          {/* Payment instructions */}
          <div className="mt-8">
            <p className="eyebrow">Step 1 of 2</p>
            <h2 className="mt-2 text-lg font-semibold text-ink">How to pay</h2>
            <p className="mt-1 text-sm text-muted">
              {payment.configured
                ? "Complete payment with one of the methods below, then notify us to activate your placement."
                : "Request the placement below and we'll be in touch with payment details."}
            </p>

            {payment.configured ? (
              <div className="mt-5 space-y-4">
                {payment.bank && (
                  <div className="card p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <Landmark className="h-4 w-4 text-brand" strokeWidth={2} />
                      {payment.payhereUrl ? "Option A — Bank transfer" : "Bank transfer"}
                    </p>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      {[
                        ["Bank", payment.bank.name],
                        ["Account name", payment.bank.accountName],
                        ["Account number", payment.bank.accountNumber],
                        ...(payment.price ? [["Amount", payment.price] as const] : []),
                      ].map(([label, value]) => (
                        <div key={label} className="flex gap-2">
                          <dt className="w-32 shrink-0 text-muted">{label}</dt>
                          <dd className="font-medium text-ink">{value}</dd>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <dt className="w-32 shrink-0 text-muted">Reference</dt>
                        <dd className="num break-all text-xs text-ink">{id}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-xs text-muted">
                      Use your listing ID as the payment reference so we can match it.
                    </p>
                  </div>
                )}

                {payment.payhereUrl && (
                  <div className="card p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <CreditCard className="h-4 w-4 text-brand" strokeWidth={2} />
                      {payment.bank ? "Option B — Pay online via PayHere" : "Pay online via PayHere"}
                    </p>
                    {payment.price && (
                      <p className="num mt-2 text-sm font-medium text-ink">
                        {payment.price}
                      </p>
                    )}
                    <a
                      href={payment.payhereUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary mt-3"
                    >
                      Pay with PayHere
                    </a>
                    <p className="mt-2 text-xs text-muted">
                      After paying on PayHere, return here and request the placement.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card mt-5 p-5">
                <p className="text-sm text-muted">
                  Payment details aren&apos;t set up online yet. Request the placement below
                  and an admin will follow up
                  {payment.contactEmail ? (
                    <>
                      {" "}at{" "}
                      <a
                        href={`mailto:${payment.contactEmail}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {payment.contactEmail}
                      </a>
                    </>
                  ) : null}
                  {" "}with how to pay.
                </p>
              </div>
            )}
          </div>

          {/* Request button — step 2 */}
          <div className="card mt-6 px-6 py-7 text-center">
            <p className="eyebrow">Step 2 of 2</p>
            <h2 className="mt-2 text-lg font-semibold text-ink">
              Notify us after payment
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Once you&apos;ve sent payment, request the placement. An admin will verify
              and activate your sponsored listing, usually within 24 hours.
            </p>
            <SponsorRequestForm action={handleRequestSponsorship} />
          </div>
        </>
      )}

      {/* Back link */}
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to my listings
        </Link>
      </div>
    </div>
  );
}
