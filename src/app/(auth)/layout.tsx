import Link from "next/link";
import { MapPin, ShieldCheck, Star, Users } from "lucide-react";

const POINTS = [
  { Icon: ShieldCheck, text: "Every listing reviewed by hand before it goes live" },
  { Icon: Users, text: "Reach travellers planning their Sri Lanka trip" },
  { Icon: Star, text: "Request a featured spot whenever you're ready" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-3.75rem)] lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-shell px-12 py-14 text-on-shell lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <MapPin className="h-5 w-5 text-gold" strokeWidth={2} />
          Ceylon Directory
        </Link>
        <div className="max-w-md">
          <p className="text-[clamp(2rem,3vw,2.75rem)] font-bold leading-[1.08] tracking-tight">
            List your service on Sri Lanka&apos;s verified directory.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-on-shell-muted">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-on-shell-overlay-sm text-gold">
                  <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                </span>
                <span className="text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="num text-xs text-on-shell-muted">Colombo, Sri Lanka</p>
      </aside>

      {/* Form area — top-aligned on mobile, centred on desktop */}
      <div className="flex items-start justify-center px-6 py-16 sm:px-12 lg:items-center lg:py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
