import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { getSessionUser } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Nav user={user} />
        <main className="flex-1">{children}</main>
        <footer className="bg-teal-900 text-teal-200 py-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-bold text-white">Ceylon Directory</p>
                <p className="text-sm mt-1">
                  Verified tourist services across Sri Lanka
                </p>
              </div>
              <nav aria-label="Footer navigation" className="flex gap-6 text-sm">
                <a href="/listings" className="hover:text-white transition-colors">
                  Browse
                </a>
                <a href="/login" className="hover:text-white transition-colors">
                  List your business
                </a>
              </nav>
            </div>
            <p className="mt-8 text-xs text-teal-400">
              © {new Date().getFullYear()} Ceylon Directory. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
