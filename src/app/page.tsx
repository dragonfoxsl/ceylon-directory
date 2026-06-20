import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  BusFront,
  Car,
  Compass,
  Flower2,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Tent,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/ListingCard";

type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type FeaturedListing = {
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

// Categories carry no stored icon — map slugs to line icons (no emoji per DESIGN).
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "tours-guides": Compass,
  "activities-experiences": Sparkles,
  "vehicle-rentals": Car,
  "equipment-rentals": Tent,
  accommodation: BedDouble,
  "transport-transfers": BusFront,
  "wellness-spa": Flower2,
  "food-dining": UtensilsCrossed,
};

// Stable placeholder photography for the hero collage (real product uses
// curated listing imagery; picsum is the sanctioned mockup source).
const HERO_PHOTOS = [
  { seed: "galle-fort", h: 520, alt: "Coastal fort ramparts at golden hour" },
  { seed: "ella-tea", h: 248, alt: "Misty tea terraces in the hill country" },
  { seed: "tuktuk-road", h: 248, alt: "A tuk-tuk on a palm-lined coast road" },
];

export default async function HomePage() {
  const supabase = await createServerClient();

  const { data: categories, error: categoriesErr } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order")
    .order("sort_order", { ascending: true });
  if (categoriesErr) console.error("[home] categories query failed:", categoriesErr);

  const now = new Date().toISOString();
  const { data: rawListings, error: listingsErr } = await supabase
    .from("listings")
    .select(
      "id, slug, title, price_info, status, is_active, is_featured, featured_until, created_at, regions(name)"
    )
    .eq("status", "approved")
    .eq("is_active", true)
    .eq("is_featured", true)
    .gt("featured_until", now)
    .limit(6);
  if (listingsErr) console.error("[home] featured listings query failed:", listingsErr);

  const featuredListings: FeaturedListing[] = [];
  if (rawListings && rawListings.length > 0) {
    for (const listing of rawListings) {
      const { data: imageRow, error: imageErr } = await supabase
        .from("listing_images")
        .select("storage_path")
        .eq("listing_id", listing.id)
        .eq("is_cover", true)
        .single();
      if (imageErr) console.error(`[home] cover image query failed for listing ${listing.id}:`, imageErr);

      let cover_url: string | null = null;
      if (imageRow?.storage_path) {
        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(imageRow.storage_path);
        cover_url = data.publicUrl;
      }

      // Supabase types the join as an array but returns a single row.
      const region =
        (listing as unknown as { regions?: { name: string } | null }).regions
          ?.name ?? null;

      featuredListings.push({ ...listing, cover_url, region });
    }
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-[1320px] items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div className="reveal">
          <p className="eyebrow flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} />
            Verified listings · island-wide
          </p>
          <h1 className="mt-5 text-[clamp(2.5rem,5.5vw,4rem)] font-bold leading-[1.04] tracking-tight text-ink">
            Plan your Sri Lanka trip with services you can trust.
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-muted">
            Browse hand-checked tours, stays, transport, and experiences — from
            Galle&apos;s ramparts to Ella&apos;s tea country. Every provider is
            reviewed before they appear here.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/listings" className="btn btn-primary">
              Browse all listings
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </Link>
            <Link href="/login" className="btn btn-secondary">
              List your business
            </Link>
          </div>
        </div>

        {/* Asymmetric photo collage */}
        <div className="reveal grid grid-cols-2 gap-4" style={{ animationDelay: "120ms" }}>
          <div className="row-span-2 overflow-hidden rounded-[1.5rem] border border-hairline">
            <img
              src={`https://picsum.photos/seed/${HERO_PHOTOS[0].seed}/640/${HERO_PHOTOS[0].h}`}
              alt={HERO_PHOTOS[0].alt}
              className="h-full w-full object-cover"
            />
          </div>
          {HERO_PHOTOS.slice(1).map((p) => (
            <div key={p.seed} className="overflow-hidden rounded-[1.5rem] border border-hairline">
              <img
                src={`https://picsum.photos/seed/${p.seed}/640/${p.h}`}
                alt={p.alt}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      {categories && categories.length > 0 && (
        <section className="border-t border-hairline bg-linen">
          <div className="mx-auto max-w-[1320px] px-6 py-16 lg:py-20">
            <div className="max-w-xl">
              <p className="eyebrow">Browse by category</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink">
                What are you looking for?
              </h2>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((cat: Category, i) => {
                const Icon = CATEGORY_ICONS[cat.slug] ?? Compass;
                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="reveal group flex items-center gap-4 rounded-2xl border border-hairline bg-surface p-5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linen text-brand transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <span className="font-medium leading-tight text-ink">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1320px] px-6 py-16 lg:py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Promoted by providers</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink">
              Featured experiences
            </h2>
          </div>
          <Link
            href="/listings"
            className="hidden items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-deep sm:inline-flex"
          >
            View all listings
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        </div>

        {featuredListings.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredListings.map((listing, i) => (
              <div
                key={listing.id}
                className="reveal"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card mt-10 flex flex-col items-center gap-4 px-8 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linen text-brand">
              <Compass className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <h3 className="text-xl font-semibold text-ink">
              No featured listings yet
            </h3>
            <p className="max-w-md text-muted">
              Providers can request a featured spot once their listing is
              verified. Be the first to put your service in front of travellers.
            </p>
            <Link href="/login" className="btn btn-primary mt-2">
              List your business
            </Link>
          </div>
        )}
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <section className="border-y border-hairline bg-linen">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-6 py-14 sm:grid-cols-3">
          {[
            {
              Icon: ShieldCheck,
              label: "Reviewed by hand",
              desc: "An admin checks every listing before it goes live — no automated approvals.",
            },
            {
              Icon: MapPinned,
              label: "Island-wide",
              desc: "Providers from Colombo and Kandy to Jaffna, Arugam Bay, and Mirissa.",
            },
            {
              Icon: Sparkles,
              label: "No pay-to-rank",
              desc: "Featured spots are clearly marked. Ordering is never sold off as search results.",
            },
          ].map(({ Icon, label, desc }) => (
            <div key={label} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-semibold text-ink">{label}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA band ─────────────────────────────────────────────── */}
      <section className="bg-brand text-on-brand">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight">
              Run a tourism business in Sri Lanka?
            </h2>
            <p className="mt-3 text-[color-mix(in_srgb,var(--on-brand)_82%,transparent)]">
              List it free, get verified, and reach travellers planning their
              trip. Request a featured spot whenever you&apos;re ready.
            </p>
          </div>
          <Link href="/login" className="btn btn-onbrand shrink-0">
            List your business
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        </div>
      </section>
    </>
  );
}
