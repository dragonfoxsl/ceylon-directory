import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { MapIcon, SearchX } from "lucide-react";
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
  region?: string | null;
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
    .select(
      "id, slug, title, price_info, status, is_active, is_featured, featured_until, created_at, regions(name)"
    )
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

      const region =
        (listing as unknown as { regions?: { name: string } | null }).regions
          ?.name ?? null;

      listings.push({ ...listing, cover_url, region });
    }
  }

  const sorted = sortListings(listings);

  const hasFilters = !!categorySlug || !!regionSlug || !!q;

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header className="max-w-2xl">
          <p className="eyebrow">Directory</p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight text-ink">
            Browse listings
          </h1>
          <p className="mt-3 text-lg text-muted">
            Every service here is reviewed by hand before it goes live.
          </p>
        </header>
        <Link
          href="/map"
          className="inline-flex items-center gap-2 rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          <MapIcon className="h-4 w-4" strokeWidth={2} />
          Map view
        </Link>
      </div>

      {/* Filters */}
      <div className="card mt-10 p-5">
        <Suspense
          fallback={
            <div className="h-11 animate-pulse rounded-lg bg-linen" />
          }
        >
          <Filters
            categories={categories ?? []}
            regions={regions ?? []}
            currentCategory={categorySlug ?? ""}
            currentRegion={regionSlug ?? ""}
            currentQ={q ?? ""}
          />
        </Suspense>
      </div>

      {/* Results */}
      {sorted.length > 0 ? (
        <>
          <p className="num mt-8 text-sm text-muted">
            {sorted.length} {sorted.length === 1 ? "listing" : "listings"}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      ) : (
        <div className="card mt-8 flex flex-col items-center gap-4 px-8 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linen text-brand">
            <SearchX className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <h2 className="text-xl font-semibold text-ink">
            {hasFilters ? "No listings match your filters" : "No listings yet"}
          </h2>
          <p className="max-w-md text-muted">
            {hasFilters
              ? "Try removing a filter or searching with a different term."
              : "Check back soon — new services are being verified all the time."}
          </p>
          {hasFilters && (
            <Link href="/listings" className="btn btn-secondary mt-2">
              Clear filters
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
