export type ListingLike = {
  status: string;
  is_active: boolean;
  is_featured: boolean;
  featured_until: string | null;
  is_sponsored: boolean;
  sponsored_until: string | null;
  created_at: string;
};

export function isLive(l: Pick<ListingLike, "status" | "is_active">): boolean {
  return l.status === "approved" && l.is_active === true;
}

export function isCurrentlyFeatured(l: ListingLike, now: Date = new Date()): boolean {
  if (!l.is_featured) return false;
  if (!l.featured_until) return false;
  return new Date(l.featured_until).getTime() > now.getTime();
}

export function isCurrentlySponsored(l: ListingLike, now: Date = new Date()): boolean {
  if (!l.is_sponsored) return false;
  if (!l.sponsored_until) return false;
  return new Date(l.sponsored_until).getTime() > now.getTime();
}

// Sort order: sponsored > featured > regular, then newest first within each tier.
export function sortListings<T extends ListingLike>(listings: T[], now: Date = new Date()): T[] {
  return [...listings].sort((a, b) => {
    const ra = (isCurrentlySponsored(a, now) ? 2 : 0) + (isCurrentlyFeatured(a, now) ? 1 : 0);
    const rb = (isCurrentlySponsored(b, now) ? 2 : 0) + (isCurrentlyFeatured(b, now) ? 1 : 0);
    if (ra !== rb) return rb - ra;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
