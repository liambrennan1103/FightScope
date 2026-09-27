import { cn } from "@/lib/cn";
import type { MethodDistribution } from "@/lib/types";

const METHODS: Array<{ key: keyof MethodDistribution; label: string }> = [
  { key: "koTko", label: "KO/TKO" },
  { key: "decision", label: "Decision" },
  { key: "submission", label: "Submission" },
];

export function MethodPrediction({ methods }: { methods: MethodDistribution }) {
  const max = Math.max(methods.koTko, methods.decision, methods.submission);

  return (
    <div className="space-y-3.5">
      {METHODS.map((method) => {
        const value = methods[method.key];
        const lead = value === max;
        return (
          <div key={method.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
                {method.label}
              </p>
              <p className={cn("tabular text-sm font-semibold", lead ? "text-accent" : "text-ink")}>
                {value}%
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500 ease-out", lead ? "bg-accent" : "bg-line-strong")}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
