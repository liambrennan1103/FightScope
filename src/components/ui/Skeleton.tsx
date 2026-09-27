import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("fs-shimmer rounded-md", className)} />;
}

export function PortraitSkeleton({
  className,
  size = "card",
}: {
  className?: string;
  size?: "avatar" | "thumb" | "card" | "medium" | "hero" | "featured";
}) {
  const sizes = {
    avatar: "h-8 w-8 rounded-full",
    thumb: "h-11 w-9 rounded-lg sm:h-12 sm:w-10",
    card: "h-16 w-16 rounded-full sm:h-[4.75rem] sm:w-[4.75rem]",
    medium: "h-[5.5rem] w-[4.25rem] rounded-xl sm:h-24 sm:w-[4.75rem]",
    hero: "h-36 w-[6.75rem] rounded-xl sm:h-44 sm:w-32 lg:h-[14.5rem] lg:w-[10.25rem]",
    featured: "h-[9.5rem] w-[7rem] rounded-xl sm:h-[12.5rem] sm:w-[9rem] lg:h-[16.5rem] lg:w-[11.5rem]",
  } as const;

  return <Skeleton className={cn("shrink-0", sizes[size], className)} />;
}

export function MatchupBoardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-surface">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2.5 w-40" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <div className="flex flex-col items-center gap-3 md:items-end">
          <PortraitSkeleton size={featured ? "featured" : "hero"} />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex flex-col items-center gap-3 px-2">
          <Skeleton className="h-2.5 w-8" />
          <Skeleton className="h-10 w-28 sm:h-12 sm:w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col items-center gap-3 md:items-start">
          <PortraitSkeleton size={featured ? "featured" : "hero"} />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="px-4 pb-5 sm:px-6">
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  );
}

export function FightCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface p-4">
      <div className="mb-3 flex justify-between">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2.5 w-16" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <PortraitSkeleton size="card" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-2.5 w-6" />
        <div className="flex flex-col items-center gap-2">
          <PortraitSkeleton size="card" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
      <Skeleton className="mt-4 h-1 w-full rounded-full" />
    </div>
  );
}

export function FighterCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface p-3.5">
      <PortraitSkeleton size="medium" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface p-4">
      <div className="flex gap-3">
        <Skeleton className="h-16 w-14 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <PortraitSkeleton size="medium" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-2.5 w-6" />
        <div className="flex flex-col items-center gap-2">
          <PortraitSkeleton size="medium" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="mt-5 flex justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function FeaturedEventSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface p-5 sm:p-7">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mt-5 flex gap-4">
        <Skeleton className="h-16 w-14 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <PortraitSkeleton size="hero" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-3 w-6" />
        <div className="flex flex-col items-center gap-3 sm:flex-row-reverse">
          <PortraitSkeleton size="hero" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
    </div>
  );
}

export function EventFightRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface px-3 py-3">
      <PortraitSkeleton size="thumb" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mx-auto h-3 w-16" />
      <Skeleton className="ml-auto h-4 w-24" />
      <PortraitSkeleton size="thumb" />
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="space-y-12">
      <div>
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="mt-3 h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      </div>
      <MatchupBoardSkeleton featured />
      <div>
        <Skeleton className="mb-5 h-5 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <FightCardSkeleton />
          <FightCardSkeleton />
          <FightCardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ComparePageSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="mt-3 h-8 w-40" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </div>
  );
}

export function DirectorySkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div>
      <Skeleton className="mb-3 h-2.5 w-20" />
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="mb-8 h-4 w-64" />
      <Skeleton className="mb-6 h-10 w-full rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <FighterCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
