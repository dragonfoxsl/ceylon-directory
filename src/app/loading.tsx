export default function Loading() {
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-16">
      {/* Page header skeleton */}
      <div className="max-w-2xl space-y-3">
        <div className="h-3.5 w-24 animate-pulse rounded-full bg-linen" />
        <div className="h-9 w-64 animate-pulse rounded-xl bg-linen" />
        <div className="h-5 w-96 animate-pulse rounded-lg bg-linen" />
      </div>

      {/* Card grid skeleton */}
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[4/3] w-full animate-pulse bg-linen" />
            <div className="space-y-2.5 p-5">
              <div className="h-3 w-20 animate-pulse rounded-full bg-linen" />
              <div className="h-5 w-3/4 animate-pulse rounded-lg bg-linen" />
              <div className="h-4 w-1/2 animate-pulse rounded-lg bg-linen" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
