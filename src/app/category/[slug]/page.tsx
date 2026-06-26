import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Compass } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { sortListings } from "@/lib/featured";
import { fetchCoverUrls } from "@/lib/covers";
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
  is_sponsored: boolean;
  sponsored_until: string | null;
  created_at: string;
  cover_url?: string | null;
  region?: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!category) notFound();

  return {
    title: `${category.name} — Ceylon Directory`,
    description: `Browse verified ${category.name} services across Sri Lanka. Every listing reviewed before going live.`,
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createServerClient();

  // Resolve slug → category row
  const { data: category, error: categoryErr } = await supabase
    .from("categories")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (categoryErr) console.error("[category] category lookup failed:", categoryErr);
  if (!category) notFound();

  // Query listings — approved + active required
  const { data: rawListings, error: listingsErr } = await supabase
    .from("listings")
    .select(
      "id, slug, title, price_info, status, is_active, is_featured, featured_until, is_sponsored, sponsored_until, created_at, regions(name)"
    )
    .eq("status", "approved")
    .eq("is_active", true)
    .eq("category_id", category.id);
  if (listingsErr) console.error("[category] listings query failed:", listingsErr);

  const listings: Listing[] = [];
  if (rawListings && rawListings.length > 0) {
    const ids = rawListings.map((l) => l.id);
    const coverUrls = await fetchCoverUrls(supabase, ids);

    for (const listing of rawListings) {
      const region =
        (listing as unknown as { regions?: { name: string } | null }).regions
          ?.name ?? null;
      listings.push({ ...listing, cover_url: coverUrls.get(listing.id) ?? null, region });
    }
  }

  const sorted = sortListings(listings);

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
      <nav
        className="flex items-center gap-1.5 text-sm text-muted"
        aria-label="Breadcrumb"
      >
        <Link href="/listings" className="transition-colors hover:text-accent">
          All listings
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        <span className="font-medium text-ink">{category.name}</span>
      </nav>

      <header className="mt-6 max-w-2xl">
        <p className="eyebrow">Category</p>
        <h1 className="mt-3 text-[clamp(2.25rem,4.5vw,3.5rem)] font-bold leading-[1.06] tracking-tight text-ink">
          {category.name}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Verified {category.name.toLowerCase()} services across Sri Lanka, reviewed before they go live.
        </p>
      </header>

      {sorted.length > 0 ? (
        <>
          <p className="mt-10 text-sm text-muted">
            <span className="num font-semibold text-ink">{sorted.length}</span>
            {" "}{sorted.length === 1 ? "listing" : "listings"}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((listing, i) => (
              <div key={listing.id} className="reveal" style={{ animationDelay: `${i * 40}ms` }}>
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card mt-10 flex flex-col items-center gap-4 px-8 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linen text-brand">
            <Compass className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <h2 className="text-xl font-semibold text-ink">
            No {category.name} listings yet
          </h2>
          <p className="max-w-md text-muted">
            Check back soon — new services are verified and added regularly.
          </p>
          <Link href="/listings" className="btn btn-secondary mt-2">
            Browse all listings
          </Link>
        </div>
      )}
    </div>
  );
}
