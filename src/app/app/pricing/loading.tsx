import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="mt-3 h-8 w-36" />
      <Skeleton className="mt-3 mb-8 h-4 w-80 max-w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
