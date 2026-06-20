"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { List, Map as MapIcon, X } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import type { ListingLike } from "@/lib/featured";
import type { RegionGroup } from "@/components/MapCanvas";

const MapCanvas = dynamic(() => import("@/components/MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-[1.5rem] bg-linen" />
  ),
});

export type MapListing = ListingLike & {
  id: string;
  slug: string;
  title: string;
  price_info: string | null;
  cover_url?: string | null;
  region: string | null;
  regionSlug: string | null;
};

export function MapBrowse({ listings }: { listings: MapListing[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const groups = useMemo<RegionGroup[]>(() => {
    const byRegion = new Map<string, RegionGroup>();
    for (const l of listings) {
      if (!l.regionSlug || !l.region) continue;
      const g = byRegion.get(l.regionSlug);
      if (g) g.count += 1;
      else byRegion.set(l.regionSlug, { slug: l.regionSlug, name: l.region, count: 1 });
    }
    return [...byRegion.values()];
  }, [listings]);

  const visible = selected
    ? listings.filter((l) => l.regionSlug === selected)
    : listings;
  const selectedName = groups.find((g) => g.slug === selected)?.name;

  function toggleSelect(slug: string) {
    setSelected((cur) => (cur === slug ? null : slug));
  }

  return (
    <div>
      {/* Mobile segmented control */}
      <div className="mb-6 inline-flex rounded-xl border border-hairline bg-surface p-1 text-sm lg:hidden">
        {(["list", "map"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setMobileView(v)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-medium capitalize transition-colors ${
              mobileView === v ? "bg-brand text-on-brand" : "text-muted hover:text-ink"
            }`}
          >
            {v === "list" ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
            {v}
          </button>
        ))}
      </div>

      {/* Active region filter pill */}
      {selected && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-sm text-muted">Showing</span>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-deep"
          >
            {selectedName}
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_1.15fr]">
        {/* List */}
        <div className={mobileView === "map" ? "hidden lg:block" : ""}>
          <p className="num mb-4 text-sm text-muted">
            {visible.length} {visible.length === 1 ? "listing" : "listings"}
          </p>
          {visible.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {visible.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="card px-6 py-12 text-center text-muted">
              No listings in this region yet.
            </div>
          )}
        </div>

        {/* Map */}
        <div className={mobileView === "list" ? "hidden lg:block" : ""}>
          <div className="sticky top-24 h-[70vh] overflow-hidden rounded-[1.5rem] border border-hairline lg:h-[calc(100vh-8rem)]">
            <MapCanvas groups={groups} selected={selected} onSelect={toggleSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
