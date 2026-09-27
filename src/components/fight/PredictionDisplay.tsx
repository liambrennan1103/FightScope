import { cn } from "@/lib/cn";
import { pct } from "@/lib/format";
import { useInViewOnce } from "@/components/ui/CountUp";

interface PredictionDisplayProps {
  leftName: string;
  rightName: string;
  leftPct: number;
  rightPct: number;
  predictedSide: "left" | "right";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PredictionDisplay({
  leftName,
  rightName,
  leftPct,
  rightPct,
  predictedSide,
  size = "md",
  className,
}: PredictionDisplayProps) {
  const large = size === "lg";
  const small = size === "sm";

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("truncate font-semibold uppercase tracking-wide text-ink", small ? "text-[11px]" : "text-xs")}>
            {leftName}
          </p>
          <p
            className={cn(
              "tabular font-semibold leading-none",
              large ? "text-3xl sm:text-4xl" : small ? "text-lg" : "text-2xl",
              predictedSide === "left" ? "text-accent" : "text-mute",
            )}
          >
            {pct(leftPct)}
          </p>
        </div>
        <span className="pb-1 text-[10px] font-medium tracking-[0.18em] text-mute">VS</span>
        <div className="min-w-0 text-right">
          <p className={cn("truncate font-semibold uppercase tracking-wide text-ink", small ? "text-[11px]" : "text-xs")}>
            {rightName}
          </p>
          <p
            className={cn(
              "tabular font-semibold leading-none",
              large ? "text-3xl sm:text-4xl" : small ? "text-lg" : "text-2xl",
              predictedSide === "right" ? "text-accent" : "text-mute",
            )}
          >
            {pct(rightPct)}
          </p>
        </div>
      </div>
      <ProbabilityBar leftPct={leftPct} predictedSide={predictedSide} />
    </div>
  );
}

export function ProbabilityBar({
  leftPct,
  predictedSide,
  className,
  durationMs = 2200,
}: {
  leftPct: number;
  predictedSide: "left" | "right";
  className?: string;
  durationMs?: number;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);
  const width = inView ? leftPct : 0;

  return (
    <div
      ref={ref}
      className={cn("flex h-1.5 overflow-hidden rounded-full bg-elevated", className)}
      role="img"
      aria-label={`${Math.round(leftPct)} to ${Math.round(100 - leftPct)}`}
    >
      <span
        className={cn(
          "h-full ease-out",
          predictedSide === "left" ? "bg-accent" : "bg-line-strong",
        )}
        style={{
          width: `${width}%`,
          transition: `width ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      />
      <span
        className={cn(
          "h-full flex-1",
          predictedSide === "right" ? "bg-accent" : "bg-[#3a3a42]",
        )}
      />
    </div>
  );
}
