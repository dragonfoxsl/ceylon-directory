"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

type NavUser = {
  profile: { role: string } | null;
} | null;

export function Nav({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/listings", label: "Browse" },
    ...(user ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...(user?.profile?.role === "admin"
      ? [{ href: "/admin", label: "Admin" }]
      : []),
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 bg-shell text-on-shell">
      <nav
        className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-3.5"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
          onClick={() => setOpen(false)}
        >
          <MapPin className="h-5 w-5 text-gold" strokeWidth={2} />
          Ceylon Directory
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? "text-on-shell"
                  : "text-on-shell-muted hover:text-on-shell"
              }`}
            >
              {l.label}
              {isActive(l.href) && (
                <span className="mt-1 block h-0.5 rounded-full bg-accent" />
              )}
            </Link>
          ))}
          <div className="mx-2 h-5 w-px bg-white/15" />
          <ThemeToggle />
          {user ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn btn-secondary ml-2 !border-white/25 !text-on-shell hover:!bg-white/10">
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn btn-primary ml-2">
              List your business
            </Link>
          )}
        </div>

        {/* Mobile trigger */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-shell"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile off-canvas panel */}
      {open && (
        <div className="border-t border-white/10 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(l.href)
                    ? "bg-white/10 text-on-shell"
                    : "text-on-shell-muted"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-white/10 pt-3">
              {user ? (
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="btn btn-secondary w-full !border-white/25 !text-on-shell"
                  >
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="btn btn-primary w-full"
                >
                  List your business
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
