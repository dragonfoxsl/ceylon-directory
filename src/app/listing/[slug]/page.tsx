import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero / cover image */}
      <div className="relative bg-teal-900 h-64 sm:h-80 md:h-96 w-full overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage.publicUrl}
            alt={listing.title}
            className="h-full w-full object-cover opacity-90"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-teal-800 to-emerald-700 flex items-center justify-center">
            <span className="text-6xl text-teal-300" aria-hidden="true">🌴</span>
          </div>
        )}
        {featured && (
          <span className="absolute top-4 right-4 rounded-full bg-amber-400 px-3 py-1 text-sm font-semibold text-amber-900 shadow-lg">
            Featured
          </span>
        )}
        {/* Dark gradient at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-gray-500" aria-label="Breadcrumb">
          <Link href="/listings" className="hover:text-teal-700 transition-colors">
            Browse
          </Link>
          {category && (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/category/${category.slug}`} className="hover:text-teal-700 transition-colors">
                {category.name}
              </Link>
            </>
          )}
          {region && (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/region/${region.slug}`} className="hover:text-teal-700 transition-colors">
                {region.name}
              </Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                {listing.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-3 items-center">
                {category && (
                  <Link
                    href={`/category/${category.slug}`}
                    className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-200 transition-colors"
                  >
                    {category.name}
                  </Link>
                )}
                {region && (
                  <Link
                    href={`/region/${region.slug}`}
                    className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200 transition-colors"
                  >
                    📍 {region.name}
                  </Link>
                )}
              </div>
            </div>

            {/* Pricing */}
            {listing.price_info && (
              <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Pricing
                </h2>
                <p className="text-gray-800 font-medium">
                  <span className="text-teal-700 font-semibold">LKR</span> {listing.price_info}
                </p>
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">About</h2>
                <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {listing.description}
                </div>
              </div>
            )}

            {/* Image gallery (non-cover images) */}
            {images.length > 1 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="aspect-square overflow-hidden rounded-lg bg-teal-50"
                    >
                      <img
                        src={img.publicUrl}
                        alt={listing.title}
                        className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: contact */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Get in Touch</h2>

              {listing.contact_phone && (
                <a
                  href={`tel:${listing.contact_phone}`}
                  className="flex items-center gap-3 w-full rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition-colors"
                >
                  <span aria-hidden="true">📞</span>
                  <span>Call Now</span>
                  <span className="ml-auto text-teal-300 text-xs truncate">{listing.contact_phone}</span>
                </a>
              )}

              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
                >
                  <span aria-hidden="true">💬</span>
                  <span>WhatsApp</span>
                </a>
              )}

              {listing.contact_email && (
                <a
                  href={`mailto:${listing.contact_email}`}
                  className="flex items-center gap-3 w-full rounded-lg bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-200 transition-colors"
                >
                  <span aria-hidden="true">✉️</span>
                  <span>Email</span>
                  <span className="ml-auto text-gray-500 text-xs truncate max-w-[100px]">
                    {listing.contact_email}
                  </span>
                </a>
              )}

              {safeWebsite && (
                <a
                  href={safeWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full rounded-lg border border-teal-300 px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
                >
                  <span aria-hidden="true">🌐</span>
                  <span>Visit Website</span>
                </a>
              )}

              {!listing.contact_phone && !whatsappNumber && !listing.contact_email && !safeWebsite && (
                <p className="text-sm text-gray-400 text-center py-2">
                  No contact details provided.
                </p>
              )}

              {/* Verified badge */}
              <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                <span className="text-teal-600" aria-hidden="true">✅</span>
                <span>Verified by Ceylon Directory</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
