import type { Metadata } from "next";
import Link from "next/link";
import { List, MapPin } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { sortListings } from "@/lib/featured";
import { fetchCoverUrls } from "@/lib/covers";
import { MapBrowse, type MapListing } from "@/components/MapBrowse";

export const metadata: Metadata = {
  title: "Map — Ceylon Directory",
  description:
    "Browse verified Sri Lanka tourist services on a map, grouped by region.",
};

export default async function MapPage() {
  const supabase = await createServerClient();

  const { data: rawListings, error } = await supabase
    .from("listings")
    .select(
      "id, slug, title, price_info, status, is_active, is_featured, featured_until, is_sponsored, sponsored_until, created_at, regions(name, slug)"
    )
    .eq("status", "approved")
    .eq("is_active", true);
  if (error) console.error("[map] listings query failed:", error);

  const listings: MapListing[] = [];
  if (rawListings && rawListings.length > 0) {
    const ids = rawListings.map((l) => l.id);
    const coverUrls = await fetchCoverUrls(supabase, ids);

    for (const listing of rawListings) {
      const region = (
        listing as unknown as { regions?: { name: string; slug: string } | null }
      ).regions;
      listings.push({
        ...listing,
        cover_url: coverUrls.get(listing.id) ?? null,
        region: region?.name ?? null,
        regionSlug: region?.slug ?? null,
      });
    }
  }

  const sorted = sortListings(listings) as MapListing[];

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <header className="max-w-2xl">
          <p className="eyebrow">Map</p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight text-ink">
            Explore by region
          </h1>
          <p className="mt-3 text-lg text-muted">
            Tap a pin to see verified services grouped by area, from Jaffna to
            Galle.
          </p>
        </header>
        <Link
          href="/listings"
          className="inline-flex items-center gap-2 rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          <List className="h-4 w-4" strokeWidth={2} />
          List view
        </Link>
      </div>

      {sorted.length > 0 ? (
        <MapBrowse listings={sorted} />
      ) : (
        <div className="card flex flex-col items-center gap-4 px-8 py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linen text-brand">
            <MapPin className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <h2 className="text-xl font-semibold text-ink">No listings on the map yet</h2>
          <p className="max-w-sm text-muted">
            Verified services will appear here as they go live. Check back soon,
            or browse the full directory in list view.
          </p>
          <Link href="/listings" className="btn btn-primary mt-2">
            <List className="h-4 w-4" strokeWidth={2} />
            Browse all listings
          </Link>
        </div>
      )}
    </div>
  );
}
