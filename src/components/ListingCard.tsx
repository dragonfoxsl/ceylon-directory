import Link from "next/link";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { isCurrentlyFeatured, type ListingLike } from "@/lib/featured";

type Card = ListingLike & {
  id: string;
  slug: string;
  title: string;
  price_info: string | null;
  cover_url?: string | null;
  region?: string | null;
};

export function ListingCard({ listing }: { listing: Card }) {
  const featured = isCurrentlyFeatured(listing);

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className="card group block overflow-hidden transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_color-mix(in_srgb,var(--ink)_28%,transparent)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-linen">
        {listing.cover_url ? (
          <Image
            src={listing.cover_url}
            alt={listing.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/50">
            <ImageIcon className="h-9 w-9" strokeWidth={1.25} />
          </div>
        )}
        {featured && (
          <span className="chip chip-featured absolute right-3 top-3 shadow-sm backdrop-blur-sm">
            Featured
          </span>
        )}
      </div>

      <div className="p-5">
        {listing.region && <p className="eyebrow mb-2">{listing.region}</p>}
        <h3 className="font-medium leading-snug text-ink transition-colors group-hover:text-accent line-clamp-2">
          {listing.title}
        </h3>
        {listing.price_info && (
          <p className="num mt-2 text-sm text-muted line-clamp-1">
            {listing.price_info}
          </p>
        )}
      </div>
    </Link>
  );
}
