import { STAT_KEYS } from "@/data/constants";
import { cn } from "@/lib/cn";
import { UNAVAILABLE } from "@/lib/format";
import type { Fighter, FighterStatistics } from "@/lib/types";

function formatStat(value: number | null, format: "percent" | "decimal"): string {
  if (value == null) return UNAVAILABLE;
  if (format === "percent") return `${Math.round(value)}%`;
  return value.toFixed(2);
}

interface StatComparisonProps {
  fighterA: Fighter;
  fighterB: Fighter;
}

export function StatComparison({ fighterA, fighterB }: StatComparisonProps) {
  const hasAny = STAT_KEYS.some(
    (stat) =>
      fighterA.statistics[stat.key as keyof FighterStatistics] != null ||
      fighterB.statistics[stat.key as keyof FighterStatistics] != null,
  );

  if (!hasAny) {
    return <p className="text-sm text-mute">Data unavailable</p>;
  }

  return (
    <div className="space-y-4">
      {STAT_KEYS.map((stat) => {
        const left = fighterA.statistics[stat.key as keyof FighterStatistics];
        const right = fighterB.statistics[stat.key as keyof FighterStatistics];
        const comparable = left != null && right != null;
        const leftWins =
          comparable && (stat.key === "sigStrikesAbsorbedPerMin" ? left <= right : left >= right);
        return (
          <div key={stat.key}>
            <p className="mb-1 text-center text-[11px] text-mute">{stat.label}</p>
            <div className="flex items-center justify-between gap-3">
              <p className={cn("tabular text-sm font-semibold", leftWins ? "text-ink" : "text-mute")}>
                {formatStat(left, stat.format)}
              </p>
              <p className={cn("tabular text-sm font-semibold", comparable && !leftWins ? "text-ink" : "text-mute")}>
                {formatStat(right, stat.format)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StatGrid({ fighter }: { fighter: Fighter }) {
  const hasAny = STAT_KEYS.some(
    (stat) => fighter.statistics[stat.key as keyof FighterStatistics] != null,
  );
  if (!hasAny) {
    return <p className="text-sm text-mute">Data unavailable</p>;
  }

  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {STAT_KEYS.map((stat) => (
        <div
          key={stat.key}
          className="flex items-center justify-between gap-3 rounded-xl bg-elevated/70 px-3 py-2.5"
        >
          <dt className="min-w-0 text-xs text-mute">{stat.label}</dt>
          <dd className="tabular shrink-0 text-sm font-semibold text-ink">
            {formatStat(fighter.statistics[stat.key as keyof FighterStatistics], stat.format)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
