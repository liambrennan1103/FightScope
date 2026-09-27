import { EventCardSkeleton, FeaturedEventSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-12">
      <div>
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="mt-3 h-8 w-40" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <FeaturedEventSkeleton />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
      </div>
    </div>
  );
}
