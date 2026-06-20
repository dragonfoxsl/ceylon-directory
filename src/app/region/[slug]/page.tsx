import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { sortListings } from "@/lib/featured";
import { ListingCard } from "@/components/ListingCard";

type Params = Promise<{ slug: string }>;

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

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerClient();
  const { data: region } = await supabase
    .from("regions")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!region) {
    return { title: "Region Not Found — Ceylon Directory" };
  }

  return {
    title: `${region.name} — Ceylon Directory`,
    description: `Discover verified tourist services in ${region.name}, Sri Lanka. Hotels, tours, transport and more — all manually reviewed.`,
  };
}

export default async function RegionPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createServerClient();

  // Resolve slug → region row
  const { data: region, error: regionErr } = await supabase
    .from("regions")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (regionErr) console.error("[region] region lookup failed:", regionErr);
  if (!region) notFound();

  // Query listings — approved + active required
  const { data: rawListings, error: listingsErr } = await supabase
    .from("listings")
    .select("id, slug, title, price_info, status, is_active, is_featured, featured_until, created_at")
    .eq("status", "approved")
    .eq("is_active", true)
    .eq("region_id", region.id);
  if (listingsErr) console.error("[region] listings query failed:", listingsErr);

  // Fetch cover images (N+1 — matches home page pattern)
  const listings: Listing[] = [];
  if (rawListings && rawListings.length > 0) {
    for (const listing of rawListings) {
      const { data: imageRow, error: imageErr } = await supabase
        .from("listing_images")
        .select("storage_path")
        .eq("listing_id", listing.id)
        .eq("is_cover", true)
        .single();
      if (imageErr) console.error(`[region] cover image query failed for listing ${listing.id}:`, imageErr);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <section className="bg-gradient-to-br from-teal-900 to-emerald-800 text-white py-14 px-6">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-4 text-sm text-teal-300" aria-label="Breadcrumb">
            <Link href="/listings" className="hover:text-white transition-colors">
              Browse
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-white">{region.name}</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{region.name}</h1>
          <p className="text-teal-200 text-base sm:text-lg">
            Verified tourist services in {region.name}, Sri Lanka
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10">
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
            <div className="text-5xl mb-4" aria-hidden="true">🗺️</div>
            <h2 className="text-xl font-semibold text-teal-800 mb-2">
              No listings in {region.name} yet
            </h2>
            <p className="text-teal-600 max-w-md mx-auto mb-6">
              Check back soon — new services are verified and added regularly.
            </p>
            <Link
              href="/listings"
              className="inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors"
            >
              Browse All Services
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
