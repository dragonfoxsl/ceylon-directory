import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/ListingCard";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
};

type FeaturedListing = {
  id: string;
  slug: string;
  title: string;
  price_info: string | null;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  featured_until: string | null;
  created_at: string;
  cover_url?: string | null;
};

export default async function HomePage() {
  const supabase = await createServerClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, icon, sort_order")
    .order("sort_order", { ascending: true });

  const now = new Date().toISOString();
  const { data: rawListings } = await supabase
    .from("listings")
    .select("id, slug, title, price_info, status, is_active, is_featured, featured_until, created_at")
    .eq("status", "approved")
    .eq("is_active", true)
    .eq("is_featured", true)
    .gt("featured_until", now)
    .limit(6);

  const featuredListings: FeaturedListing[] = [];
  if (rawListings && rawListings.length > 0) {
    for (const listing of rawListings) {
      const { data: imageRow } = await supabase
        .from("listing_images")
        .select("storage_path")
        .eq("listing_id", listing.id)
        .eq("is_cover", true)
        .single();

      let cover_url: string | null = null;
      if (imageRow?.storage_path) {
        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(imageRow.storage_path);
        cover_url = data.publicUrl;
      }

      featuredListings.push({ ...listing, cover_url });
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-700 text-white py-24 px-6 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, #f59e0b 0%, transparent 60%), radial-gradient(circle at 80% 20%, #065f46 0%, transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 text-amber-300 font-semibold tracking-widest uppercase text-sm">
            Sri Lanka&apos;s Trusted Travel Directory
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight">
            Discover Verified<br className="hidden sm:block" /> Tourist Services
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-teal-100 max-w-2xl mx-auto leading-relaxed">
            From pristine beaches to misty hill country — find trusted hotels, tours,
            transport, and experiences curated across every corner of Sri Lanka.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/listings"
              className="rounded-full bg-amber-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-amber-400 transition-colors shadow-lg"
            >
              Browse All Services
            </Link>
            <Link
              href="/login"
              className="rounded-full border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
            >
              List Your Business
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="py-16 px-6 bg-white">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
              Browse by Category
            </h2>
            <p className="text-center text-gray-500 mb-10">
              Find exactly what you need for your Sri Lanka adventure
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.map((cat: Category) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-5 text-center hover:border-teal-400 hover:bg-teal-50 hover:shadow-md transition-all duration-200"
                >
                  {cat.icon && (
                    <span className="text-3xl" aria-hidden="true">
                      {cat.icon}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-700 group-hover:text-teal-700 transition-colors leading-tight">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Listings */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
            Featured Services
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Handpicked, verified listings ready for your next trip
          </p>

          {featuredListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50 py-20 px-8 text-center">
              <div className="text-5xl mb-4" aria-hidden="true">🌴</div>
              <h3 className="text-xl font-semibold text-teal-800 mb-2">
                Be the first to list your service
              </h3>
              <p className="text-teal-600 max-w-md mx-auto mb-6">
                No featured listings yet — but Sri Lanka is full of incredible experiences
                waiting to be discovered. Add yours and reach thousands of travellers.
              </p>
              <Link
                href="/login"
                className="inline-block rounded-full bg-teal-700 px-8 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition-colors"
              >
                Get Listed Today
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-12 px-6 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { icon: "✅", label: "Verified Listings", desc: "Every service is reviewed before going live" },
              { icon: "🗺️", label: "Island-Wide Coverage", desc: "From Colombo to Jaffna, we've got you covered" },
              { icon: "🤝", label: "Trusted by Travellers", desc: "Real experiences from real visitors" },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className="text-3xl" aria-hidden="true">{icon}</span>
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
