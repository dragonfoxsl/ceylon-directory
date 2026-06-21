"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";

type Option = {
  id: string;
  name: string;
  slug: string;
};

type FiltersProps = {
  categories: Option[];
  regions: Option[];
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

  // Local search state so typing stays responsive; URL updates are debounced.
  const [q, setQ] = useState(currentQ);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync the input when the URL `q` changes elsewhere (e.g. Clear all / pill
  // removal) — adjusting state during render, no effect needed.
  const [prevQ, setPrevQ] = useState(currentQ);
  if (currentQ !== prevQ) {
    setPrevQ(currentQ);
    setQ(currentQ);
  }

  // When the URL `q` changes (incl. Clear all / pill removal), drop any pending
  // debounced push so a stale keystroke can't re-add a term the user cleared.
  // Also cancels a pending push if the component unmounts mid-debounce.
  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [currentQ]);

  function pushParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function onSearch(value: string) {
    setQ(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => pushParam("q", value.trim()), 300);
  }

  const categoryName = categories.find((c) => c.slug === currentCategory)?.name;
  const regionName = regions.find((r) => r.slug === currentRegion)?.name;
  const activePills = [
    currentQ && { key: "q", label: `“${currentQ}”` },
    categoryName && { key: "category", label: categoryName },
    regionName && { key: "region", label: regionName },
  ].filter(Boolean) as { key: string; label: string }[];

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={2}
          />
          <label htmlFor="filter-q" className="sr-only">
            Search listings
          </label>
          <input
            id="filter-q"
            type="search"
            placeholder="Search by name…"
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            className="field !pl-10"
          />
        </div>

        {/* Category */}
        <SelectControl
          id="filter-category"
          label="Filter by category"
          value={currentCategory}
          onChange={(v) => pushParam("category", v)}
          placeholder="All categories"
          options={categories}
        />

        {/* Region */}
        <SelectControl
          id="filter-region"
          label="Filter by region"
          value={currentRegion}
          onChange={(v) => pushParam("region", v)}
          placeholder="All regions"
          options={regions}
        />
      </div>

      {/* Active filter pills */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activePills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => pushParam(pill.key, "")}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-deep"
            >
              {pill.label}
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-muted underline-offset-2 hover:text-accent hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function SelectControl({
  id,
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Option[];
}) {
  return (
    <div className="relative sm:w-48">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field cursor-pointer appearance-none !pr-9"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        strokeWidth={2}
      />
    </div>
  );
}
