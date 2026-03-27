import { Card } from "@/components/ui/card"

export default function MigrationLoading() {
  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-6">
      {/* Progress bar skeleton */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-muted animate-pulse" />
            {i < 5 && <div className="w-8 h-0.5 bg-muted animate-pulse" />}
          </div>
        ))}
      </div>

      {/* Title skeleton */}
      <div className="text-center space-y-2">
        <div className="h-6 w-64 bg-muted animate-pulse rounded-lg mx-auto" />
        <div className="h-4 w-96 bg-muted/60 animate-pulse rounded-lg mx-auto" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto w-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="rounded-2xl border border-border/40 p-6 space-y-3">
            <div className="size-10 rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-full bg-muted/60 animate-pulse rounded" />
            <div className="h-3 w-3/4 bg-muted/60 animate-pulse rounded" />
          </Card>
        ))}
      </div>
    </div>
  )
}
