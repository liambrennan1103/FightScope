import Link from "next/link";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Fighter } from "@/lib/types";
import { formatRecord, rankingLabel } from "@/lib/format";
import { routes } from "@/lib/routes";

export function FighterCard({ fighter }: { fighter: Fighter }) {
  const rank = rankingLabel(fighter.ranking);

  return (
    <Link href={routes.fighter(fighter.slug)} className="block h-full">
      <Card hover padding="sm" className="flex h-full items-center gap-3.5">
        <FighterPortrait fighter={fighter} name={fighter.name} portrait={fighter.portrait} variant="medium" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-ink">{fighter.name}</h3>
            {rank ? (
              <Badge className="shrink-0" tone={fighter.ranking === "C" ? "accent" : "mute"}>
                {rank}
              </Badge>
            ) : null}
          </div>
          {fighter.nickname ? (
            <p className="mt-0.5 truncate text-[11px] text-mute">“{fighter.nickname}”</p>
          ) : null}
          <p className="mt-1.5 text-sm font-medium tabular text-ink">{formatRecord(fighter.record)}</p>
          <p className="text-xs text-mute">{fighter.division ?? "—"}</p>
        </div>
      </Card>
    </Link>
  );
}
