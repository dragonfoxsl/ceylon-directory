import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { setActive, setFeatured } from "@/actions/moderation";

type Listing = {
  id: string;
  title: string;
  slug: string;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  featured_until: string | null;
  created_at: string;
  categories: { name: string } | null;
  regions: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

export default async function AdminListingsPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, slug, status, is_active, is_featured, featured_until, created_at, categories(name), regions(name), profiles(full_name)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/listings] query failed:", error);
  }

  const listings = (data ?? []) as unknown as Listing[];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            All Listings
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
            {listings.length} total listing{listings.length !== 1 ? "s" : ""}
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
            href="/admin/promotions"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 font-medium text-amber-800 hover:bg-amber-100 transition-colors"
          >
            Promotions
          </Link>
        </div>
      </div>

      {listings.length === 0 ? (
        <p className="text-gray-500 text-center py-20">No listings yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Listing
                </th>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden lg:table-cell">
                  Provider
                </th>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">
                  Category / Region
                </th>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Active
                </th>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden xl:table-cell">
                  Featured until
                </th>
                <th className="py-3 pl-3 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {listings.map((listing) => {
                async function handleToggleActive() {
                  "use server";
                  await setActive(listing.id, !listing.is_active);
                }

                async function handleSetFeatured(formData: FormData) {
                  "use server";
                  const dateVal = formData.get("until") as string | null;
                  if (dateVal) {
                    // end-of-day UTC for the chosen date
                    await setFeatured(listing.id, `${dateVal}T23:59:59Z`);
                  } else {
                    await setFeatured(listing.id, null);
                  }
                }

                async function handleClearFeatured() {
                  "use server";
                  await setFeatured(listing.id, null);
                }

                const now = new Date();
                const featuredActive =
                  listing.is_featured &&
                  listing.featured_until &&
                  new Date(listing.featured_until) > now;

                return (
                  <tr key={listing.id} className="hover:bg-gray-50 transition-colors align-top">
                    <td className="py-4 pl-6 pr-3">
                      <div className="font-medium text-gray-900">{listing.title}</div>
                      {featuredActive && (
                        <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-gray-600 hidden lg:table-cell">
                      {listing.profiles?.full_name ?? "—"}
                    </td>
                    <td className="py-4 px-3 text-gray-600 hidden md:table-cell">
                      <div>{listing.categories?.name ?? "—"}</div>
                      <div className="text-gray-400">{listing.regions?.name ?? ""}</div>
                    </td>
                    <td className="py-4 px-3">
                      <StatusBadge status={listing.status} />
                    </td>
                    <td className="py-4 px-3">
                      <form action={handleToggleActive}>
                        <button
                          type="submit"
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            listing.is_active
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {listing.is_active ? "Active" : "Inactive"}
                        </button>
                      </form>
                    </td>
                    <td className="py-4 px-3 hidden xl:table-cell text-gray-500 text-xs">
                      {listing.featured_until
                        ? new Date(listing.featured_until).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="py-4 pl-3 pr-6">
                      <div className="flex flex-col items-end gap-2">
                        {/* Set featured date */}
                        <form action={handleSetFeatured} className="flex items-center gap-1">
                          <input
                            type="date"
                            name="until"
                            defaultValue={
                              listing.featured_until
                                ? listing.featured_until.slice(0, 10)
                                : ""
                            }
                            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <button
                            type="submit"
                            className="rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
                          >
                            Set
                          </button>
                        </form>
                        {/* Clear featured */}
                        <form action={handleClearFeatured}>
                          <button
                            type="submit"
                            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Clear featured
                          </button>
                        </form>
                        <Link
                          href={`/dashboard/${listing.id}/edit`}
                          className="text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
