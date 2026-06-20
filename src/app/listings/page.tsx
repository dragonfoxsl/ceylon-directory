import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { sortListings } from "@/lib/featured";
import { ListingCard } from "@/components/ListingCard";
import { Filters } from "@/components/Filters";

export const metadata: Metadata = {
  title: "Browse All Services — Ceylon Directory",
  description:
    "Find verified hotels, tours, transport, and experiences across every corner of Sri Lanka.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type Listing = {
  id: string;
  slug: string;
  title: string;
  price_info: string | null;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  featured_until: string | null;
  created_at: string;
  cover_url?: string | null;
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const categorySlug = typeof sp.category === "string" ? sp.category : undefined;
  const regionSlug = typeof sp.region === "string" ? sp.region : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : undefined;

  const supabase = await createServerClient();

  // Load categories and regions for the filter UI
  const { data: categories, error: categoriesErr } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("sort_order", { ascending: true });
  if (categoriesErr) console.error("[listings] categories query failed:", categoriesErr);

  const { data: regions, error: regionsErr } = await supabase
    .from("regions")
    .select("id, name, slug")
    .order("name", { ascending: true });
  if (regionsErr) console.error("[listings] regions query failed:", regionsErr);

  // Resolve optional category slug → id
  let categoryId: string | undefined;
  if (categorySlug) {
    const { data: cat, error: catErr } = await supabase
      .from("categories")
      .select("id, name")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (catErr) console.error("[listings] category slug lookup failed:", catErr);
    if (cat) categoryId = cat.id;
  }

  // Resolve optional region slug → id
  let regionId: string | undefined;
  if (regionSlug) {
    const { data: reg, error: regErr } = await supabase
      .from("regions")
      .select("id, name")
      .eq("slug", regionSlug)
      .maybeSingle();
    if (regErr) console.error("[listings] region slug lookup failed:", regErr);
    if (reg) regionId = reg.id;
  }

  // Build listings query — approved + active is required in every public query
  let query = supabase
    .from("listings")
    .select("id, slug, title, price_info, status, is_active, is_featured, featured_until, created_at")
    .eq("status", "approved")
    .eq("is_active", true);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (regionId) query = query.eq("region_id", regionId);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data: rawListings, error: listingsErr } = await query;
  if (listingsErr) console.error("[listings] listings query failed:", listingsErr);

  // Fetch cover images (N+1 acceptable — matches home page pattern)
  const listings: Listing[] = [];
  if (rawListings && rawListings.length > 0) {
    for (const listing of rawListings) {
      const { data: imageRow, error: imageErr } = await supabase
        .from("listing_images")
        .select("storage_path")
        .eq("listing_id", listing.id)
        .eq("is_cover", true)
        .single();
      if (imageErr) console.error(`[listings] cover image query failed for listing ${listing.id}:`, imageErr);

      let cover_url: string | null = null;
      if (imageRow?.storage_path) {
        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(imageRow.storage_path);
        cover_url = data.publicUrl;
      }

      listings.push({ ...listing, cover_url });
    }
  }

  const sorted = sortListings(listings);

  const hasFilters = !!categorySlug || !!regionSlug || !!q;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <section className="bg-gradient-to-br from-teal-900 to-emerald-800 text-white py-14 px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Browse All Services
          </h1>
          <p className="text-teal-200 text-base sm:text-lg">
            Every listing verified by our team before going live
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Filters */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <Filters
            categories={categories ?? []}
            regions={regions ?? []}
            currentCategory={categorySlug ?? ""}
            currentRegion={regionSlug ?? ""}
            currentQ={q ?? ""}
          />
        </div>

        {/* Results */}
        {sorted.length > 0 ? (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {sorted.length} {sorted.length === 1 ? "listing" : "listings"} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sorted.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50 py-20 px-8 text-center">
            <div className="text-5xl mb-4" aria-hidden="true">🌴</div>
            <h2 className="text-xl font-semibold text-teal-800 mb-2">
              {hasFilters ? "No listings match your filters" : "No listings yet"}
            </h2>
            <p className="text-teal-600 max-w-md mx-auto">
              {hasFilters
                ? "Try removing some filters or searching with a different term."
                : "Check back soon — new services are being verified all the time."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
