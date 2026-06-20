import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { setFeatured, clearPromotionRequest } from "@/actions/moderation";

type Listing = {
  id: string;
  title: string;
  promotion_requested_at: string;
  is_featured: boolean;
  featured_until: string | null;
  categories: { name: string } | null;
  regions: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

export default async function AdminPromotionsPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, promotion_requested_at, is_featured, featured_until, categories(name), regions(name), profiles(full_name)",
    )
    .not("promotion_requested_at", "is", null)
    .order("promotion_requested_at", { ascending: true });

  if (error) {
    console.error("[admin/promotions] query failed:", error);
  }

  const listings = (data ?? []) as unknown as Listing[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Promotion Requests
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
            {listings.length} pending promotion request{listings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/admin"
            className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 font-medium text-yellow-800 hover:bg-yellow-100 transition-colors"
          >
            Pending queue
          </Link>
          <Link
            href="/admin/listings"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            All listings
          </Link>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 py-20 px-8 text-center">
          <p className="text-2xl mb-3" aria-hidden="true">&#11088;</p>
          <h2 className="text-xl font-semibold text-amber-800 mb-2">No pending requests</h2>
          <p className="text-amber-600">No providers have requested featured placement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            async function handleActivate(formData: FormData) {
              "use server";
              const dateVal = formData.get("until") as string | null;
              if (dateVal) {
                await setFeatured(listing.id, `${dateVal}T23:59:59Z`);
              }
            }

            async function handleDismiss() {
              "use server";
              await clearPromotionRequest(listing.id);
            }

            const now = new Date();
            const alreadyFeatured =
              listing.is_featured &&
              listing.featured_until &&
              new Date(listing.featured_until) > now;

            return (
              <div
                key={listing.id}
                className="rounded-xl border border-amber-100 bg-white shadow-sm overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-gray-900">
                        {listing.title}
                      </h2>
                      {alreadyFeatured && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Already featured
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      {listing.profiles?.full_name && (
                        <span>
                          Provider:{" "}
                          <span className="font-medium text-gray-700">
                            {listing.profiles.full_name}
                          </span>
                        </span>
                      )}
                      {listing.categories?.name && (
                        <span>{listing.categories.name}</span>
                      )}
                      {listing.regions?.name && (
                        <span>{listing.regions.name}</span>
                      )}
                      <span>
                        Requested:{" "}
                        {new Date(listing.promotion_requested_at).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </span>
                      {listing.featured_until && (
                        <span className="text-amber-600">
                          Featured until:{" "}
                          {new Date(listing.featured_until).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 bg-amber-50 border-t border-amber-100">
                  {/* Activate with date */}
                  <form action={handleActivate} className="flex items-center gap-2">
                    <label
                      htmlFor={`until-${listing.id}`}
                      className="text-xs font-medium text-gray-600"
                    >
                      Feature until:
                    </label>
                    <input
                      id={`until-${listing.id}`}
                      type="date"
                      name="until"
                      required
                      className="rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-colors"
                    >
                      Activate
                    </button>
                  </form>

                  {/* Dismiss without featuring */}
                  <form action={handleDismiss}>
                    <button
                      type="submit"
                      className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
                    >
                      Dismiss
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
