import Link from "next/link";
import { MapPin } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-28 text-center">
      <div className="relative mb-8">
        <MapPin
          className="h-16 w-16 text-accent"
          strokeWidth={1.25}
          aria-hidden="true"
        />
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rejected text-xs font-bold text-white">
          ?
        </span>
      </div>

      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
        This spot isn&apos;t on the map.
      </h1>
      <p className="mt-4 max-w-sm text-muted">
        The page you&apos;re looking for may have moved, or the URL might be
        wrong. Sri Lanka has over 65,000&nbsp;km² to explore — try starting
        from the directory.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/listings" className="btn btn-primary">
          Browse all listings
        </Link>
        <Link href="/" className="btn btn-secondary">
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
