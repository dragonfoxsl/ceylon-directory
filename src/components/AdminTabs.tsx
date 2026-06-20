import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Pending" },
  { href: "/admin/listings", label: "All listings" },
  { href: "/admin/promotions", label: "Promotions" },
];

export function AdminTabs({ active }: { active: string }) {
  return (
    <div className="inline-flex rounded-xl border border-hairline bg-surface p-1 text-sm">
      {TABS.map((tab) => {
        const isActive = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg px-3.5 py-1.5 font-medium transition-colors ${
              isActive
                ? "bg-brand text-on-brand"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
