import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Ceylon Directory",
  description:
    "Ceylon Directory is Sri Lanka's trusted tourist-services directory. Every listing is manually reviewed by our team before it goes live.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-teal-900 to-emerald-800 text-white py-16 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">About Ceylon Directory</h1>
          <p className="text-teal-200 text-lg sm:text-xl">
            Sri Lanka&apos;s home for verified, trustworthy tourist services
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        {/* Mission */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed text-lg">
            Ceylon Directory connects travellers with the best tourist services across Sri Lanka —
            from the golden beaches of the south coast to the mist-covered highlands of Nuwara Eliya,
            and from the ancient ruins of the Cultural Triangle to the wildlife-rich national parks.
          </p>
          <p className="mt-4 text-gray-700 leading-relaxed">
            We believe that finding a trustworthy hotel, tour guide, or transport provider in a
            new country shouldn&apos;t be a gamble. Every service listed on Ceylon Directory has been
            reviewed and approved by our team before it appears to the public.
          </p>
        </section>

        {/* How verification works */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How Verification Works</h2>
          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "Providers apply",
                body: "Business owners and service providers register and submit their listing with full contact details, description, pricing, and photos.",
              },
              {
                step: "2",
                title: "Admin review",
                body: "Our team manually reviews every submission. We check that the information is accurate, contact details are valid, and the service is genuine.",
              },
              {
                step: "3",
                title: "Approval and publication",
                body: "Only listings that pass our review are approved and made visible to travellers. Listings that don't meet our standards are rejected with feedback so providers can reapply.",
              },
              {
                step: "4",
                title: "Ongoing monitoring",
                body: "We monitor active listings and can deactivate any service that no longer meets our standards. Providers can also request featured placement to appear at the top of search results.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-600 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust signals */}
        <section className="rounded-2xl bg-teal-50 border border-teal-200 p-8">
          <h2 className="text-xl font-bold text-teal-900 mb-4">What this means for you</h2>
          <ul className="space-y-3 text-teal-800">
            {[
              "Every listing you see has been checked by a real person — not just an algorithm.",
              "Contact details are verified so you can reach service providers with confidence.",
              "Listings can be flagged and removed if they fall below our standards.",
              "There are no hidden fees for travellers — Ceylon Directory is free to browse.",
            ].map((item) => (
              <li key={item} className="flex gap-3 items-start">
                <span className="text-teal-600 mt-0.5" aria-hidden="true">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center">
          <p className="text-gray-600 mb-6 text-lg">
            Ready to explore Sri Lanka? Start with our verified listings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/listings"
              className="rounded-full bg-teal-700 px-8 py-3.5 text-base font-semibold text-white hover:bg-teal-600 transition-colors shadow"
            >
              Browse Services
            </Link>
            <Link
              href="/login"
              className="rounded-full border-2 border-teal-700 px-8 py-3.5 text-base font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
            >
              List Your Business
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
