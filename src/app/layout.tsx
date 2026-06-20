import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import Link from "next/link";
import "./globals.css";
import { satoshi, geistMono } from "@/lib/fonts";
import { themeInitScript } from "@/components/ThemeToggle";
import { Nav } from "@/components/Nav";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ceylon Directory — Verified Sri Lanka Tourist Services",
  description:
    "Discover trusted hotels, tours, transport, and experiences across Sri Lanka. Every listing verified for quality and authenticity.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Nav user={user} />
        <main className="flex-1">{children}</main>

        <footer className="bg-shell-deep text-on-shell-muted">
          <div className="mx-auto max-w-[1320px] px-6 py-14">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xs">
                <p className="flex items-center gap-2 text-lg font-bold text-on-shell">
                  <MapPin className="h-5 w-5 text-gold" strokeWidth={2} />
                  Ceylon Directory
                </p>
                <p className="mt-3 text-sm leading-relaxed">
                  A curated directory of verified tourist services across Sri
                  Lanka — every listing reviewed by hand before it goes live.
                </p>
              </div>
              <nav
                aria-label="Footer"
                className="flex flex-col gap-3 text-sm sm:items-end"
              >
                <Link href="/listings" className="hover:text-on-shell transition-colors">
                  Browse listings
                </Link>
                <Link href="/about" className="hover:text-on-shell transition-colors">
                  How verification works
                </Link>
                <Link href="/login" className="hover:text-on-shell transition-colors">
                  List your business
                </Link>
              </nav>
            </div>
            <div className="mt-12 border-t border-white/10 pt-6">
              <p className="num text-xs">
                © {new Date().getFullYear()} Ceylon Directory · Colombo, Sri Lanka
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
