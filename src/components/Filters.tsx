"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Region = {
  id: string;
  name: string;
  slug: string;
};

type FiltersProps = {
  categories: Category[];
  regions: Region[];
  currentCategory?: string;
  currentRegion?: string;
  currentQ?: string;
};

export function Filters({
  categories,
  regions,
  currentCategory = "",
  currentRegion = "",
  currentQ = "",
}: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="flex-1">
        <label htmlFor="filter-q" className="sr-only">
          Search listings
        </label>
        <input
          id="filter-q"
          type="search"
          placeholder="Search by name…"
          defaultValue={currentQ}
          onChange={(e) => updateParam("q", e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="filter-category" className="sr-only">
          Filter by category
        </label>
        <select
          id="filter-category"
          value={currentCategory}
          onChange={(e) => updateParam("category", e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Region */}
      <div>
        <label htmlFor="filter-region" className="sr-only">
          Filter by region
        </label>
        <select
          id="filter-region"
          value={currentRegion}
          onChange={(e) => updateParam("region", e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Regions</option>
          {regions.map((reg) => (
            <option key={reg.id} value={reg.slug}>
              {reg.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
