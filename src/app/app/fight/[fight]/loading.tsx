import { MatchupBoardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-12">
      <div>
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      </div>
      <MatchupBoardSkeleton featured />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
