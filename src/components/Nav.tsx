import Link from "next/link";

type NavUser = {
  profile: { role: string } | null;
} | null;

export function Nav({ user }: { user: NavUser }) {
  return (
    <header className="sticky top-0 z-50 bg-teal-900/95 backdrop-blur-sm border-b border-teal-800">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="text-xl font-bold text-white tracking-tight hover:text-amber-300 transition-colors"
        >
          Ceylon Directory
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className="text-teal-200 hover:text-white transition-colors"
          >
            Home
          </Link>
          <Link
            href="/listings"
            className="text-teal-200 hover:text-white transition-colors"
          >
            Browse
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className="text-teal-200 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
          )}
          {user?.profile?.role === "admin" && (
            <Link
              href="/admin"
              className="text-teal-200 hover:text-white transition-colors"
            >
              Admin
            </Link>
          )}
          {user ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md bg-teal-700 px-4 py-1.5 text-white hover:bg-teal-600 transition-colors"
              >
                Logout
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-amber-500 px-4 py-1.5 text-white hover:bg-amber-400 transition-colors font-semibold"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
