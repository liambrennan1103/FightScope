import Link from "next/link";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { cn } from "@/lib/cn";
import { formatRecord } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { FightView } from "@/lib/types";

export function EventFightRow({ view }: { view: FightView }) {
  const { fight, fighterA, fighterB } = view;
  const completed = fight.status === "completed";
  const cancelled = fight.status === "cancelled";
  const winnerId = fight.outcome?.winnerId ?? null;

  return (
    <Link
      href={routes.fight(fight.slug)}
      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface px-3 py-3.5 transition-[border-color,transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-white/14 hover:bg-elevated/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:gap-4 sm:px-4"
    >
      <FighterSide fighter={fighterA} align="left" winner={completed && winnerId === fighterA.id} />
      <div className="min-w-[5.5rem] flex-1 text-center sm:min-w-[8rem]">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-mute">VS</p>
        <p className="mt-1 text-[11px] text-mute">
          {[fight.division, `${fight.rounds}R`].filter(Boolean).join(" · ")}
        </p>
        {cancelled ? (
          <p className="mt-1 text-[12px] text-mute">Cancelled</p>
        ) : completed && fight.outcome ? (
          <p className="mt-1 text-[12px] text-ink">
            {winnerId === fighterA.id
              ? fighterA.lastName
              : winnerId === fighterB.id
                ? fighterB.lastName
                : "Draw"}
            {fight.outcome.method ? ` · ${fight.outcome.method}` : ""}
            {fight.outcome.round ? ` · R${fight.outcome.round}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-[12px] font-semibold text-accent">Analyze</p>
        )}
      </div>
      <FighterSide fighter={fighterB} align="right" winner={completed && winnerId === fighterB.id} />
    </Link>
  );
}

function FighterSide({
  fighter,
  align,
  winner,
}: {
  fighter: FightView["fighterA"];
  align: "left" | "right";
  winner?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <FighterPortrait
        fighter={fighter}
        name={fighter.name}
        portrait={fighter.portrait}
        variant="thumb"
        ring={winner}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{fighter.lastName || fighter.name}</p>
        <p className="truncate text-[11px] text-mute">{formatRecord(fighter.record)}</p>
      </div>
    </div>
  );
}
