import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { cn } from "@/lib/cn";
import type { Fighter } from "@/lib/types";

export function EventEmptyHeadliner({
  fighterA,
  fighterB,
  size = "card",
}: {
  fighterA?: Fighter | null;
  fighterB?: Fighter | null;
  size?: "card" | "hero";
}) {
  const known = Boolean(fighterA || fighterB);
  const portrait = size === "hero" ? "hero" : "medium";

  if (!known) {
    return (
      <div className="rounded-lg border border-dashed border-white/14 bg-black/20 px-4 py-6 text-center">
        <div className="mx-auto mb-3 flex justify-center gap-6 opacity-70">
          <EmptySlot size={size} />
          <span className="self-center text-[10px] font-semibold tracking-[0.22em] text-mute">VS</span>
          <EmptySlot size={size} />
        </div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">Main event</p>
        <p className="mt-1 text-sm text-ink">To be announced</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
      <KnownOrEmpty fighter={fighterA ?? null} portrait={portrait} fallback="To be announced" />
      <span className="text-[10px] font-semibold tracking-[0.22em] text-mute">VS</span>
      <KnownOrEmpty fighter={fighterB ?? null} portrait={portrait} fallback="Opponent TBA" />
    </div>
  );
}

function EmptySlot({ size }: { size: "card" | "hero" }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-white/15 bg-black/15",
        size === "hero" ? "h-20 w-14 sm:h-28 sm:w-20" : "h-14 w-11",
      )}
    />
  );
}

function KnownOrEmpty({
  fighter,
  portrait,
  fallback,
}: {
  fighter: Fighter | null;
  portrait: "medium" | "hero";
  fallback: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      {fighter ? (
        <FighterPortrait fighter={fighter} name={fighter.name} portrait={fighter.portrait} variant={portrait} />
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20",
            portrait === "hero"
              ? "h-36 w-[6.75rem] sm:h-44 sm:w-32"
              : "h-[5.5rem] w-[4.25rem] sm:h-24 sm:w-[4.75rem]",
          )}
        />
      )}
      <p className="mt-2 w-full truncate text-sm font-semibold text-ink">{fighter?.name ?? fallback}</p>
    </div>
  );
}
