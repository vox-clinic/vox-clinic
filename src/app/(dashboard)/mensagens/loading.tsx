import { Skeleton } from "@/components/ui/skeleton"

export default function MensagensLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-32" />
      </div>

      {/* Chat layout */}
      <div className="flex gap-4 h-[70vh]">
        {/* Conversation list */}
        <div className="w-80 space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>

        {/* Message area */}
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-12 w-48 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
