import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Globe,
  ImageIcon,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { isCurrentlyFeatured } from "@/lib/featured";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, description, status, is_active, is_featured, featured_until, created_at")
    .eq("slug", slug)
    .eq("status", "approved")
    .eq("is_active", true)
    .maybeSingle();

  if (!listing) {
    return { title: "Listing Not Found — Ceylon Directory" };
  }

  // Fetch cover image for og:image
  let coverUrl: string | undefined;
  const { data: coverRow } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", listing.id)
    .eq("is_cover", true)
    .single();
  if (coverRow?.storage_path) {
    const { data } = supabase.storage
      .from("listing-images")
      .getPublicUrl(coverRow.storage_path);
    coverUrl = data.publicUrl;
  }

  return {
    title: `${listing.title} — Ceylon Directory`,
    description: listing.description
      ? listing.description.slice(0, 160)
      : `Discover ${listing.title} on Ceylon Directory — verified Sri Lanka tourist services.`,
    openGraph: coverUrl
      ? { images: [{ url: coverUrl }] }
      : undefined,
  };
}

export default async function ListingDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createServerClient();

  // Fetch listing — approved + active is required; anything else is notFound()
  const { data: listing, error: listingErr } = await supabase
    .from("listings")
    .select(
      "id, slug, title, description, price_info, contact_phone, contact_whatsapp, contact_email, website, status, is_active, is_featured, featured_until, created_at, category_id, region_id"
    )
    .eq("slug", slug)
    .eq("status", "approved")
    .eq("is_active", true)
    .maybeSingle();

  if (listingErr) console.error("[listing-detail] listing query failed:", listingErr);
  if (!listing) notFound();

  // Fetch all images ordered by sort_order
  const { data: imageRows, error: imagesErr } = await supabase
    .from("listing_images")
    .select("id, storage_path, is_cover, sort_order")
    .eq("listing_id", listing.id)
    .order("sort_order", { ascending: true });
  if (imagesErr) console.error("[listing-detail] images query failed:", imagesErr);

  const images = (imageRows ?? []).map((row) => {
    const { data } = supabase.storage
      .from("listing-images")
      .getPublicUrl(row.storage_path);
    return { ...row, publicUrl: data.publicUrl };
  });

  const coverImage = images.find((img) => img.is_cover) ?? images[0] ?? null;

  // Fetch category and region for breadcrumbs / links
  const { data: category } = listing.category_id
    ? await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("id", listing.category_id)
        .maybeSingle()
    : { data: null };

  const { data: region } = listing.region_id
    ? await supabase
        .from("regions")
        .select("id, name, slug")
        .eq("id", listing.region_id)
        .maybeSingle()
    : { data: null };

  const featured = isCurrentlyFeatured(listing);

  // WhatsApp: strip non-digits from number
  const whatsappNumber = listing.contact_whatsapp
    ? listing.contact_whatsapp.replace(/\D/g, "")
    : null;

  // Website: only allow http/https schemes (block javascript:, data:, etc.)
  const safeWebsite = (() => {
    if (!listing.website) return null;
    try {
      const u = new URL(listing.website);
      return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
    } catch {
      return null;
    }
  })();

  const hasContact =
    listing.contact_phone ||
    whatsappNumber ||
    listing.contact_email ||
    safeWebsite;

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      {/* Breadcrumb */}
      <nav
        className="flex flex-wrap items-center gap-1.5 text-sm text-muted"
        aria-label="Breadcrumb"
      >
        <Link href="/listings" className="transition-colors hover:text-accent">
          Browse
        </Link>
        {category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            <Link
              href={`/category/${category.slug}`}
              className="transition-colors hover:text-accent"
            >
              {category.name}
            </Link>
          </>
        )}
        {region && (
          <>
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            <Link
              href={`/region/${region.slug}`}
              className="transition-colors hover:text-accent"
            >
              {region.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        <span className="max-w-[200px] truncate font-medium text-ink">
          {listing.title}
        </span>
      </nav>

      {/* Cover */}
      <div className="relative mt-6 aspect-[21/9] w-full overflow-hidden rounded-[1.5rem] border border-hairline bg-linen">
        {coverImage ? (
          <Image
            src={coverImage.publicUrl}
            alt={listing.title}
            fill
            sizes="(min-width: 1320px) 1320px, 100vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/50">
            <ImageIcon className="h-12 w-12" strokeWidth={1.25} />
          </div>
        )}
        {featured && (
          <span className="chip chip-featured absolute right-4 top-4 shadow-sm backdrop-blur-sm">
            Featured
          </span>
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-10 lg:col-span-2">
          <div>
            {region && <p className="eyebrow">{region.name}</p>}
            <h1 className="mt-2 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.06] tracking-tight text-ink">
              {listing.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {category && (
                <Link
                  href={`/category/${category.slug}`}
                  className="rounded-full border border-hairline px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {category.name}
                </Link>
              )}
              {region && (
                <Link
                  href={`/region/${region.slug}`}
                  className="rounded-full border border-hairline px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {region.name}
                </Link>
              )}
            </div>
          </div>

          {listing.price_info && (
            <div className="card p-5">
              <p className="eyebrow">Pricing</p>
              <p className="num mt-2 text-lg font-medium text-ink">
                {listing.price_info}
              </p>
            </div>
          )}

          {listing.description && (
            <div>
              <h2 className="text-xl font-semibold text-ink">About</h2>
              <div className="mt-3 max-w-[65ch] whitespace-pre-wrap leading-relaxed text-muted">
                {listing.description}
              </div>
            </div>
          )}

          {images.length > 1 && (
            <div>
              <h2 className="text-xl font-semibold text-ink">Gallery</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-hairline bg-linen"
                  >
                    <Image
                      src={img.publicUrl}
                      alt={listing.title}
                      fill
                      sizes="(min-width: 640px) 22vw, 45vw"
                      className="object-cover transition-transform duration-500 ease-out hover:scale-[1.04]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: contact */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24 space-y-3 p-6">
            <h2 className="text-lg font-semibold text-ink">Contact</h2>

            {listing.contact_phone && (
              <a href={`tel:${listing.contact_phone}`} className="btn btn-primary w-full justify-start">
                <Phone className="h-4 w-4" strokeWidth={2} />
                Call
                <span className="num ml-auto text-xs opacity-80">
                  {listing.contact_phone}
                </span>
              </a>
            )}

            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary w-full justify-start"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={2} />
                WhatsApp
              </a>
            )}

            {listing.contact_email && (
              <a
                href={`mailto:${listing.contact_email}`}
                className="btn btn-secondary w-full justify-start"
              >
                <Mail className="h-4 w-4" strokeWidth={2} />
                Email
              </a>
            )}

            {safeWebsite && (
              <a
                href={safeWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary w-full justify-start"
              >
                <Globe className="h-4 w-4" strokeWidth={2} />
                Visit website
              </a>
            )}

            {!hasContact && (
              <p className="py-2 text-center text-sm text-muted">
                No contact details provided.
              </p>
            )}

            <div className="flex items-center gap-2 border-t border-hairline pt-4 text-xs text-muted">
              <ShieldCheck className="h-4 w-4 text-approved" strokeWidth={2} />
              <span>Verified by Ceylon Directory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
