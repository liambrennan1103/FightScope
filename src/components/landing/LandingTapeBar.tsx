import { cn } from "@/lib/cn";

/**
 * Signature “tale of the tape” bar — always encodes a real left/right share.
 * Left = Corner Red fill, right = Tape Blue. Amber tick marks the split (pick edge).
 */
export function LandingTapeBar({
  leftPct,
  active = true,
  className,
  heightClassName = "h-2.5",
  showTick = true,
  "aria-label": ariaLabel,
}: {
  leftPct: number;
  active?: boolean;
  className?: string;
  heightClassName?: string;
  showTick?: boolean;
  "aria-label"?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(leftPct) ? leftPct : 50));
  const width = active ? clamped : 0;
  const right = Math.round(100 - clamped);

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn("flex overflow-hidden rounded-sm bg-elevated", heightClassName)}
        role="img"
        aria-label={ariaLabel ?? `${Math.round(clamped)}% to ${right}%`}
      >
        <span
          className="h-full bg-accent-fill transition-[width] duration-700 ease-out"
          style={{ width: `${width}%` }}
        />
        <span
          className="h-full flex-1 bg-tape transition-opacity duration-500"
          style={{ opacity: active ? 1 : 0.35 }}
        />
      </div>
      {showTick ? (
        <span
          className="pointer-events-none absolute top-1/2 z-[1] h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-amber transition-[left] duration-700 ease-out"
          style={{ left: `${width}%` }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

/** Dual opposing attribute bars (A left ← → B right) from real scores 0–100. */
export function LandingAttributeTape({
  left,
  right,
  label,
  active = true,
}: {
  left: number;
  right: number;
  label: string;
  active?: boolean;
}) {
  const total = left + right;
  const leftShare = total > 0 ? (left / total) * 100 : 50;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 font-mono text-[11px] tabular-nums text-mute">
        <span className={left >= right ? "text-accent" : undefined}>{Math.round(left)}</span>
        <span className="text-[10px] font-semibold tracking-[0.14em] text-mute uppercase">
          {label}
        </span>
        <span className={right > left ? "text-tape" : undefined}>{Math.round(right)}</span>
      </div>
      <LandingTapeBar leftPct={leftShare} active={active} heightClassName="h-1.5" showTick={false} />
    </div>
  );
}
