import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { requestPromotion } from "@/actions/promotion";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PromoteListingPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createServerClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, title, is_featured, featured_until, promotion_requested_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !listing) {
    notFound();
  }

  const now = new Date();
  const isFeatured =
    listing.is_featured &&
    listing.featured_until &&
    new Date(listing.featured_until) > now;

  const alreadyRequested = !!listing.promotion_requested_at;

  async function handleRequestPromotion() {
    "use server";
    await requestPromotion(id);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-teal-700 transition-colors">
          My Listings
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs inline-block align-bottom">
          {listing.title}
        </span>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-gray-900 font-medium">Promote</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
        Promote your listing
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Get featured placement and reach more travellers exploring Sri Lanka.
      </p>

      {/* What you get */}
      <div className="mb-8 rounded-xl border border-teal-200 bg-teal-50 px-6 py-5">
        <h2 className="text-base font-semibold text-teal-900 mb-3">What featured placement includes</h2>
        <ul className="space-y-2 text-sm text-teal-800">
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 text-teal-500 font-bold">&#10003;</span>
            Highlighted at the top of category and region search results
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 text-teal-500 font-bold">&#10003;</span>
            Featured badge on your listing card
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 text-teal-500 font-bold">&#10003;</span>
            Inclusion in &quot;Featured listings&quot; on the home page
          </li>
        </ul>
      </div>

      {/* State: currently featured */}
      {isFeatured ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-center">
          <div className="text-3xl mb-2" aria-hidden="true">&#11088;</div>
          <p className="text-emerald-800 font-semibold text-lg mb-1">Currently featured</p>
          <p className="text-emerald-700 text-sm">
            Your listing is featured until{" "}
            <span className="font-medium">
              {new Date(listing.featured_until!).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            .
          </p>
        </div>
      ) : alreadyRequested ? (
        /* State: promotion requested, awaiting admin */
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 text-center">
          <div className="text-3xl mb-2" aria-hidden="true">&#128336;</div>
          <p className="text-amber-800 font-semibold text-lg mb-1">
            Promotion requested — pending admin activation
          </p>
          <p className="text-amber-700 text-sm">
            Requested on{" "}
            <span className="font-medium">
              {new Date(listing.promotion_requested_at!).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            . We will activate your featured placement after confirming payment.
          </p>
        </div>
      ) : (
        /* State: not yet requested — show payment instructions + request button */
        <>
          {/* Payment instructions — CONFIGURABLE PLACEHOLDERS */}
          {/* ⚠️ SITE OPERATOR: Replace all placeholder values below with your real payment details */}
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-6 py-5">
            <h2 className="text-base font-semibold text-amber-900 mb-1">
              How to pay — step 1 of 2
            </h2>
            <p className="text-amber-800 text-sm mb-4">
              Choose a payment method below and complete the transfer. Then click
              &quot;Request promotion&quot; to notify us.
            </p>

            <div className="space-y-5">
              {/* Bank transfer */}
              <div className="rounded-lg border border-amber-100 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-gray-800 mb-2">
                  Option A — Bank transfer
                </p>
                {/* SITE OPERATOR: replace with your real bank details */}
                <dl className="text-sm text-gray-700 space-y-1">
                  <div className="flex gap-2">
                    <dt className="w-32 shrink-0 text-gray-500">Bank</dt>
                    <dd className="font-medium text-amber-700 italic">[Bank name — replace me]</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 shrink-0 text-gray-500">Account name</dt>
                    <dd className="font-medium text-amber-700 italic">[Account name — replace me]</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 shrink-0 text-gray-500">Account number</dt>
                    <dd className="font-medium text-amber-700 italic">[Account number — replace me]</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 shrink-0 text-gray-500">Amount</dt>
                    <dd className="font-medium text-amber-700 italic">[Price — replace me]</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 shrink-0 text-gray-500">Reference</dt>
                    <dd className="font-mono text-xs text-gray-600 break-all">{id}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-gray-500">
                  Please use your listing ID as the payment reference so we can match your payment.
                </p>
              </div>

              {/* PayHere */}
              <div className="rounded-lg border border-amber-100 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-gray-800 mb-2">
                  Option B — Pay online via PayHere
                </p>
                {/* SITE OPERATOR: replace with your real PayHere payment link */}
                <p className="text-sm text-amber-700 italic mb-2">
                  [PayHere payment link placeholder — replace me]
                </p>
                <p className="text-xs text-gray-500">
                  After completing payment on PayHere, return here and click &quot;Request
                  promotion&quot; below.
                </p>
              </div>
            </div>
          </div>

          {/* Request button — step 2 */}
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-6 text-center shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-1">
              Step 2 — Notify us after payment
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Once you have sent your payment, click below. An admin will verify and
              activate your featured placement (usually within 24 hours).
            </p>
            <form action={handleRequestPromotion}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-8 py-3 text-sm font-semibold text-white shadow hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-colors"
              >
                I&apos;ve paid — request promotion
              </button>
            </form>
          </div>
        </>
      )}

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-teal-700 transition-colors"
        >
          &larr; Back to my listings
        </Link>
      </div>
    </div>
  );
}
