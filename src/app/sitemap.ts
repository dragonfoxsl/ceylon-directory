import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ceylondirectory.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerClient();

  const [{ data: listings }, { data: categories }, { data: regions }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("slug, created_at")
        .eq("status", "approved")
        .eq("is_active", true),
      supabase.from("categories").select("slug"),
      supabase.from("regions").select("slug"),
    ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, priority: 1, changeFrequency: "daily" },
    { url: `${BASE}/listings`, priority: 0.9, changeFrequency: "daily" },
    { url: `${BASE}/map`, priority: 0.7, changeFrequency: "weekly" },
    { url: `${BASE}/about`, priority: 0.5, changeFrequency: "monthly" },
  ];

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${BASE}/listing/${l.slug}`,
    lastModified: l.created_at ? new Date(l.created_at) : undefined,
    priority: 0.8,
    changeFrequency: "weekly" as const,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${BASE}/category/${c.slug}`,
    priority: 0.7,
    changeFrequency: "daily" as const,
  }));

  const regionRoutes: MetadataRoute.Sitemap = (regions ?? []).map((r) => ({
    url: `${BASE}/region/${r.slug}`,
    priority: 0.7,
    changeFrequency: "daily" as const,
  }));

  return [...staticRoutes, ...listingRoutes, ...categoryRoutes, ...regionRoutes];
}
