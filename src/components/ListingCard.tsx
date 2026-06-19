import Link from "next/link";
import { isCurrentlyFeatured, type ListingLike } from "@/lib/featured";

type Card = ListingLike & {
  id: string;
  slug: string;
  title: string;
  price_info: string | null;
  cover_url?: string | null;
};

export function ListingCard({ listing }: { listing: Card }) {
  const featured = isCurrentlyFeatured(listing);

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className="group block rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-teal-300 transition-all duration-200"
    >
      {listing.cover_url ? (
        <div className="relative h-44 w-full overflow-hidden bg-teal-50">
          <img
            src={listing.cover_url}
            alt={listing.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {featured && (
            <span className="absolute top-2 right-2 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-900 shadow">
              Featured
            </span>
          )}
        </div>
      ) : (
        <div className="relative h-44 w-full bg-gradient-to-br from-teal-100 to-emerald-50 flex items-center justify-center">
          <span className="text-4xl text-teal-300">🌴</span>
          {featured && (
            <span className="absolute top-2 right-2 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-900 shadow">
              Featured
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors line-clamp-2">
          {listing.title}
        </h3>
        {listing.price_info && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-1">{listing.price_info}</p>
        )}
      </div>
    </Link>
  );
}
