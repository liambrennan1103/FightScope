import { EventFightRowSkeleton, FeaturedEventSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-10">
      <FeaturedEventSkeleton />
      <div>
        <Skeleton className="mb-4 h-5 w-28" />
        <div className="space-y-2">
          <EventFightRowSkeleton />
          <EventFightRowSkeleton />
          <EventFightRowSkeleton />
          <EventFightRowSkeleton />
        </div>
      </div>
    </div>
  );
}
