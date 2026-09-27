import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDate, UNAVAILABLE } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { RecentFight } from "@/lib/types";

export function RecentFightRow({ fight }: { fight: RecentFight }) {
  const tone =
    fight.result === "W"
      ? "bg-accent text-white"
      : fight.result === "L"
        ? "bg-elevated text-mute ring-1 ring-white/10"
        : "bg-elevated text-ink ring-1 ring-white/10";

  const inner = (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold",
          tone,
        )}
      >
        {fight.result}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{fight.opponentName}</p>
        <p className="truncate text-[11px] text-mute">
          {fight.method ?? UNAVAILABLE}
          {fight.round ? ` · R${fight.round}` : ""}
          {fight.time ? ` · ${fight.time}` : ""}
          <span className="hidden sm:inline">
            <span className="mx-1.5 text-white/15">·</span>
            {fight.eventName}
          </span>
        </p>
      </div>
      <span className="shrink-0 text-[11px] text-mute">
        {formatDate(fight.date, { weekday: undefined, year: "numeric" })}
      </span>
    </div>
  );

  if (fight.opponentSlug) {
    return (
      <Link href={routes.fighter(fight.opponentSlug)} className="block transition-colors duration-200 hover:bg-elevated/60">
        {inner}
      </Link>
    );
  }

  return inner;
}

export function RecentFightList({ fights }: { fights: RecentFight[] }) {
  if (fights.length === 0) {
    return <p className="py-6 text-sm text-mute">No recent fights available</p>;
  }

  return (
    <div className="divide-y divide-white/[0.06]">
      {fights.map((fight, index) => (
        <RecentFightRow key={`${fight.opponentName}-${fight.date}-${index}`} fight={fight} />
      ))}
    </div>
  );
}
