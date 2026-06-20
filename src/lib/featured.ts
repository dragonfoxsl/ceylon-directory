export type ListingLike = {
  status: string;
  is_active: boolean;
  is_featured: boolean;
  featured_until: string | null;
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

export function sortListings<T extends ListingLike>(listings: T[], now: Date = new Date()): T[] {
  return [...listings].sort((a, b) => {
    const fa = isCurrentlyFeatured(a, now) ? 1 : 0;
    const fb = isCurrentlyFeatured(b, now) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
