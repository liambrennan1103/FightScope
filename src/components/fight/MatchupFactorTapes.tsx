"use client";

import { cn } from "@/lib/cn";
import type { Fighter } from "@/lib/types";
import { CountUpValue, useInViewOnce } from "@/components/ui/CountUp";

type FactorDef = {
  key: string;
  label: string;
  leftValue: number;
  rightValue: number;
  leftDisplay: string;
  rightDisplay: string;
  unitHint: string;
};

function formatReach(cm: number | null): { value: number; display: string } | null {
  if (cm == null || !Number.isFinite(cm)) return null;
  return {
    value: cm,
    display: `${Math.round(cm)}`,
  };
}

function buildFactors(fighterA: Fighter, fighterB: Fighter): FactorDef[] {
  const rows: FactorDef[] = [];

  const reachA = formatReach(fighterA.reachCm);
  const reachB = formatReach(fighterB.reachCm);
  if (reachA && reachB) {
    rows.push({
      key: "reach",
      label: "Reach",
      leftValue: reachA.value,
      rightValue: reachB.value,
      leftDisplay: reachA.display,
      rightDisplay: reachB.display,
      unitHint: "cm",
    });
  }

  // Attribute scores are clampScore()'d to 0–100 in server/analysis/attributes.ts
  const attr = (key: string, label: string) => {
    const left = Number(fighterA.attributes[key] ?? 0);
    const right = Number(fighterB.attributes[key] ?? 0);
    if (!Number.isFinite(left) && !Number.isFinite(right)) return;
    rows.push({
      key,
      label,
      leftValue: left,
      rightValue: right,
      leftDisplay: String(Math.round(left)),
      rightDisplay: String(Math.round(right)),
      unitHint: "/100",
    });
  };

  attr("striking", "Striking");
  attr("recentForm", "Recent form");
  attr("cardio", "Cardio");

  return rows.slice(0, 4);
}

/**
 * Option A — red encodes the advantage on each row (not a fixed corner).
 * Bars fill from the meeting point outward with a spring overshoot on scaleX.
 */
function AdvantageTapeBar({
  leftValue,
  rightValue,
  active,
  label,
  leftName,
  rightName,
  leftDisplay,
  rightDisplay,
}: {
  leftValue: number;
  rightValue: number;
  active: boolean;
  label: string;
  leftName: string;
  rightName: string;
  leftDisplay: string;
  rightDisplay: string;
}) {
  const total = leftValue + rightValue;
  const leftPct = total > 0 ? (leftValue / total) * 100 : 50;
  const rightPct = 100 - leftPct;
  const leftLeads = leftValue >= rightValue;

  return (
    <div
      className={cn("relative h-1.5 overflow-hidden rounded-sm bg-elevated", !active && "opacity-40")}
      role="img"
      aria-label={`${label}: ${leftName} ${leftDisplay}, ${rightName} ${rightDisplay}. Advantage: ${leftLeads ? leftName : rightName}`}
    >
      <span
        className={cn(
          "fs-tape-spring absolute inset-y-0 left-0 origin-right",
          leftLeads ? "bg-accent-fill" : "bg-white/20",
        )}
        style={{
          width: `${leftPct}%`,
          transform: active ? "scaleX(1)" : "scaleX(0)",
        }}
      />
      <span
        className={cn(
          "fs-tape-spring absolute inset-y-0 right-0 origin-left",
          !leftLeads ? "bg-accent-fill" : "bg-white/20",
        )}
        style={{
          width: `${rightPct}%`,
          transform: active ? "scaleX(1)" : "scaleX(0)",
          left: `${leftPct}%`,
          right: "auto",
        }}
      />
    </div>
  );
}

function FactorRow({
  factor,
  index,
  fighterA,
  fighterB,
  active,
}: {
  factor: FactorDef;
  index: number;
  fighterA: Fighter;
  fighterB: Fighter;
  active: boolean;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.35);
  const play = active && inView;
  const leftLeads = factor.leftValue >= factor.rightValue;
  const leftNum = Number(factor.leftDisplay);
  const rightNum = Number(factor.rightDisplay);

  return (
    <div
      ref={ref}
      id={`factor-${factor.key}`}
      className={cn(
        "group scroll-mt-24 rounded-lg border border-transparent px-1 py-2 transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/[0.08] hover:bg-white/[0.03]",
        play && "fs-factor-reveal",
      )}
      style={play ? { animationDelay: `${index * 100}ms` } : undefined}
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="tabular text-[11px] font-semibold tracking-[0.12em] text-accent">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
          {factor.label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "w-[4.5rem] shrink-0 font-mono text-[12px] tabular-nums sm:w-24",
            leftLeads ? "text-accent" : "text-mute",
          )}
        >
          {Number.isFinite(leftNum) ? (
            <CountUpValue value={leftNum} active={play} />
          ) : (
            factor.leftDisplay
          )}
          <span className="ml-0.5 text-[10px] text-mute">{factor.unitHint}</span>
        </span>
        <AdvantageTapeBar
          leftValue={factor.leftValue}
          rightValue={factor.rightValue}
          active={play}
          label={factor.label}
          leftName={fighterA.lastName}
          rightName={fighterB.lastName}
          leftDisplay={`${factor.leftDisplay}${factor.unitHint}`}
          rightDisplay={`${factor.rightDisplay}${factor.unitHint}`}
        />
        <span
          className={cn(
            "w-[4.5rem] shrink-0 text-right font-mono text-[12px] tabular-nums sm:w-24",
            !leftLeads ? "text-accent" : "text-mute",
          )}
        >
          {Number.isFinite(rightNum) ? (
            <CountUpValue value={rightNum} active={play} />
          ) : (
            factor.rightDisplay
          )}
          <span className="ml-0.5 text-[10px] text-mute">{factor.unitHint}</span>
        </span>
      </div>
    </div>
  );
}

export function MatchupFactorTapes({
  fighterA,
  fighterB,
  active = true,
  className,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  active?: boolean;
  className?: string;
}) {
  const factors = buildFactors(fighterA, fighterB);

  if (!factors.length) {
    return (
      <p className="text-sm text-mute">Comparative factor data is limited for this matchup.</p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-[11px] text-mute">
        Red marks the edge on each line · {fighterA.lastName} left · {fighterB.lastName} right
      </p>
      {factors.map((factor, index) => (
        <FactorRow
          key={factor.key}
          factor={factor}
          index={index}
          fighterA={fighterA}
          fighterB={fighterB}
          active={active}
        />
      ))}
      <p className="pt-1 text-[11px] leading-5 text-mute">
        {/* Confirmed: clampScore() in src/server/analysis/attributes.ts bounds attribute scores to 0–100. */}
        Striking, recent form, and cardio are FightScope attribute scores on a 0–100 scale. Reach is
        physical measurement in cm.
      </p>
    </div>
  );
}
