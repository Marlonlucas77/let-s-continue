import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl animate-in fade-in duration-500">
      <Skeleton className="h-9 w-48 mb-2" />
      <Skeleton className="h-4 w-64 mb-6" />

      <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-surface p-5 h-28 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 mt-8 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="card-surface p-5 h-72">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FixtureCardSkeleton() {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-3 w-24" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-3 w-6" />
        <div className="flex items-center gap-2 justify-end">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}
