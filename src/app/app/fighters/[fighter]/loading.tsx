import { PortraitSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-12">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
        <PortraitSkeleton size="hero" />
        <div className="w-full max-w-sm space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </div>
  );
}
