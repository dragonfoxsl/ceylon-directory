import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { AdminTabs } from "@/components/AdminTabs";
import { setActive, setFeatured, setSponsored } from "@/actions/moderation";

type Listing = {
  id: string;
  title: string;
  slug: string;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  featured_until: string | null;
  is_sponsored: boolean;
  sponsored_until: string | null;
  sponsored_requested_at: string | null;
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
      "id, title, slug, status, is_active, is_featured, featured_until, is_sponsored, sponsored_until, sponsored_requested_at, created_at, categories(name), regions(name), profiles(full_name)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/listings] query failed:", error);
  }

  const listings = (data ?? []) as unknown as Listing[];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Moderation</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
            All listings
          </h1>
          <p className="num mt-2 text-sm text-muted">
            {listings.length} total listing{listings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AdminTabs active="/admin/listings" />
      </div>

      {listings.length === 0 ? (
        <p className="card px-8 py-20 text-center text-muted">No listings yet.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-linen">
                <th className="eyebrow py-3 pl-6 pr-3 font-medium">Listing</th>
                <th className="eyebrow hidden py-3 px-3 font-medium lg:table-cell">
                  Provider
                </th>
                <th className="eyebrow hidden py-3 px-3 font-medium md:table-cell">
                  Category / Region
                </th>
                <th className="eyebrow py-3 px-3 font-medium">Status</th>
                <th className="eyebrow py-3 px-3 font-medium">Active</th>
                <th className="eyebrow hidden py-3 px-3 font-medium xl:table-cell">
                  Featured until
                </th>
                <th className="eyebrow py-3 pl-3 pr-6 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
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

                async function handleSetSponsored(formData: FormData) {
                  "use server";
                  const dateVal = formData.get("until") as string | null;
                  await setSponsored(listing.id, dateVal ? `${dateVal}T23:59:59Z` : null);
                }

                async function handleClearSponsored() {
                  "use server";
                  await setSponsored(listing.id, null);
                }

                const now = new Date();
                const featuredActive =
                  listing.is_featured &&
                  listing.featured_until &&
                  new Date(listing.featured_until) > now;
                const sponsoredActive =
                  listing.is_sponsored &&
                  listing.sponsored_until &&
                  new Date(listing.sponsored_until) > now;

                return (
                  <tr
                    key={listing.id}
                    className="border-t border-hairline align-top transition-colors hover:bg-linen/50"
                  >
                    <td className="py-4 pl-6 pr-3">
                      <div className="font-medium text-ink">{listing.title}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {sponsoredActive && <span className="chip chip-sponsored">Sponsored</span>}
                        {listing.sponsored_requested_at && !sponsoredActive && (
                          <span className="chip bg-brand/10 text-brand">Sponsor req.</span>
                        )}
                        {featuredActive && <span className="chip chip-featured">Featured</span>}
                      </div>
                    </td>
                    <td className="hidden py-4 px-3 text-muted lg:table-cell">
                      {listing.profiles?.full_name ?? "—"}
                    </td>
                    <td className="hidden py-4 px-3 text-muted md:table-cell">
                      <div className="text-ink">{listing.categories?.name ?? "—"}</div>
                      <div>{listing.regions?.name ?? ""}</div>
                    </td>
                    <td className="py-4 px-3">
                      <StatusBadge status={listing.status} />
                    </td>
                    <td className="py-4 px-3">
                      <form action={handleToggleActive}>
                        <button
                          type="submit"
                          className={`chip transition-colors ${
                            listing.is_active
                              ? "chip-approved hover:opacity-80"
                              : "bg-muted/15 text-muted hover:bg-muted/25"
                          }`}
                        >
                          {listing.is_active ? "Active" : "Inactive"}
                        </button>
                      </form>
                    </td>
                    <td className="num hidden py-4 px-3 text-xs text-muted xl:table-cell">
                      {listing.featured_until
                        ? new Date(listing.featured_until).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : <span aria-hidden="true" className="text-muted/40">·</span>}
                    </td>
                    <td className="py-4 pl-3 pr-6">
                      <div className="flex flex-col items-end gap-2">
                        {/* Set featured date */}
                        <form action={handleSetFeatured} className="flex items-center gap-1.5">
                          <label htmlFor={`featured-until-${listing.id}`} className="sr-only">Featured until date</label>
                          <input
                            id={`featured-until-${listing.id}`}
                            type="date"
                            name="until"
                            required
                            defaultValue={
                              listing.featured_until
                                ? listing.featured_until.slice(0, 10)
                                : ""
                            }
                            className="field num !px-2 !py-1 !text-xs"
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand transition-colors hover:bg-brand-deep"
                          >
                            Set
                          </button>
                        </form>
                        {/* Clear featured */}
                        <form action={handleClearFeatured}>
                          <button
                            type="submit"
                            className="rounded-lg border border-hairline px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:text-ink"
                          >
                            Clear featured
                          </button>
                        </form>

                        <div className="w-full border-t border-hairline pt-2">
                          {/* Set sponsored date */}
                          <form action={handleSetSponsored} className="flex items-center gap-1.5">
                            <label htmlFor={`sponsored-until-${listing.id}`} className="sr-only">Sponsored until date</label>
                            <input
                              id={`sponsored-until-${listing.id}`}
                              type="date"
                              name="until"
                              required
                              defaultValue={
                                listing.sponsored_until
                                  ? listing.sponsored_until.slice(0, 10)
                                  : ""
                              }
                              className="field num !px-2 !py-1 !text-xs"
                            />
                            <button
                              type="submit"
                              className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand transition-colors hover:bg-brand-deep"
                            >
                              Sponsor
                            </button>
                          </form>
                          {/* Clear sponsored */}
                          <form action={handleClearSponsored} className="mt-1.5">
                            <button
                              type="submit"
                              className="rounded-lg border border-hairline px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:text-ink"
                            >
                              Clear sponsored
                            </button>
                          </form>
                        </div>

                        <Link
                          href={`/dashboard/${listing.id}/edit`}
                          className="-mx-1 -my-1 inline-block rounded px-1 py-1 text-xs font-medium text-accent transition-colors hover:text-accent-deep"
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
