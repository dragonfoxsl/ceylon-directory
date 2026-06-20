import type { NextConfig } from "next";

// Allow next/image to optimize Supabase Storage public objects. The host is
// env-driven (local 127.0.0.1:54321 in dev, <ref>.supabase.co in prod), so it's
// derived from NEXT_PUBLIC_SUPABASE_URL rather than hard-coded.
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  // Placeholder photography used in mockups (hero collage).
  { protocol: "https", hostname: "picsum.photos" },
  { protocol: "https", hostname: "fastly.picsum.photos" },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    const { protocol, hostname, port } = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      ...(port ? { port } : {}),
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // Invalid URL — skip; images will simply fail to load until configured.
  }
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
};

export default nextConfig;
