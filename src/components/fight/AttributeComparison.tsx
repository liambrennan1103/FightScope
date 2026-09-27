import { ATTRIBUTE_KEYS } from "@/data/constants";
import { cn } from "@/lib/cn";
import type { Fighter } from "@/lib/types";

interface AttributeComparisonProps {
  fighterA: Fighter;
  fighterB: Fighter;
  keys?: ReadonlyArray<{ key: string; label: string }>;
}

export function AttributeComparison({
  fighterA,
  fighterB,
  keys = ATTRIBUTE_KEYS,
}: AttributeComparisonProps) {
  return (
    <div className="space-y-3.5">
      {keys.map((item) => {
        const left = fighterA.attributes[item.key] ?? 0;
        const right = fighterB.attributes[item.key] ?? 0;
        const leftWins = left >= right;
        return (
          <div key={item.key}>
            <div className="mb-1.5 grid grid-cols-[2.25rem_minmax(0,1fr)_auto_minmax(0,1fr)_2.25rem] items-center gap-2">
              <span className={cn("tabular text-sm font-semibold", leftWins ? "text-ink" : "text-mute")}>
                {left}
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-elevated">
                <span
                  className={cn("block h-full rounded-full transition-[width] duration-500 ease-out", leftWins ? "bg-accent" : "bg-line-strong")}
                  style={{ width: `${left}%` }}
                />
              </span>
              <span className="max-w-[5.5rem] truncate px-1 text-center text-[10px] font-semibold tracking-[0.12em] text-mute uppercase">
                {item.label}
              </span>
              <span className="flex h-1.5 justify-end overflow-hidden rounded-full bg-elevated">
                <span
                  className={cn("h-full rounded-full", !leftWins ? "bg-accent" : "bg-line-strong")}
                  style={{ width: `${right}%` }}
                />
              </span>
              <span className={cn("tabular text-right text-sm font-semibold", !leftWins ? "text-ink" : "text-mute")}>
                {right}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
