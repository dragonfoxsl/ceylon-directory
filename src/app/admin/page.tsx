import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { approveListing, rejectListing } from "@/actions/moderation";

type Listing = {
  id: string;
  title: string;
  status: string;
  description: string | null;
  price_info: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  created_at: string;
  categories: { name: string } | null;
  regions: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

export default async function AdminPendingPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, status, description, price_info, contact_phone, contact_email, website, created_at, categories(name), regions(name), profiles(full_name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin] pending listings query failed:", error);
  }

  const listings = (data ?? []) as unknown as Listing[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Pending Listings
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} awaiting review
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/admin/listings"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            All listings
          </Link>
          <Link
            href="/admin/promotions"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 font-medium text-amber-800 hover:bg-amber-100 transition-colors"
          >
            Promotions
          </Link>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50 py-20 px-8 text-center">
          <p className="text-2xl mb-3" aria-hidden="true">&#10003;</p>
          <h2 className="text-xl font-semibold text-teal-800 mb-2">All clear</h2>
          <p className="text-teal-600">No listings are awaiting review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {listings.map((listing) => {
            async function handleApprove() {
              "use server";
              await approveListing(listing.id);
            }

            async function handleReject(formData: FormData) {
              "use server";
              const note = formData.get("note") as string;
              await rejectListing(listing.id, note);
            }

            return (
              <div
                key={listing.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {listing.title}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      {listing.profiles?.full_name && (
                        <span>
                          Provider: <span className="font-medium text-gray-700">{listing.profiles.full_name}</span>
                        </span>
                      )}
                      {listing.categories?.name && (
                        <span>{listing.categories.name}</span>
                      )}
                      {listing.regions?.name && (
                        <span>{listing.regions.name}</span>
                      )}
                      <span>
                        Submitted:{" "}
                        {new Date(listing.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={listing.status} />
                </div>

                {/* Details */}
                <div className="px-6 py-4 space-y-3">
                  {listing.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Description
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                        {listing.description}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {listing.price_info && (
                      <span>
                        <span className="text-gray-500">Price: </span>
                        {listing.price_info}
                      </span>
                    )}
                    {listing.contact_phone && (
                      <span>
                        <span className="text-gray-500">Phone: </span>
                        {listing.contact_phone}
                      </span>
                    )}
                    {listing.contact_email && (
                      <span>
                        <span className="text-gray-500">Email: </span>
                        {listing.contact_email}
                      </span>
                    )}
                    {listing.website && (
                      <span>
                        <span className="text-gray-500">Website: </span>
                        <a
                          href={listing.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:underline"
                        >
                          {listing.website}
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 px-6 py-4 bg-gray-50 border-t border-gray-100">
                  {/* Approve */}
                  <form action={handleApprove}>
                    <button
                      type="submit"
                      className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
                    >
                      Approve
                    </button>
                  </form>

                  {/* Reject */}
                  <form action={handleReject} className="flex flex-1 items-start gap-2">
                    <textarea
                      name="note"
                      rows={1}
                      placeholder="Rejection reason (optional)"
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition-colors"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
