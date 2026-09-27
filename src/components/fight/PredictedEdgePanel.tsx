"use client";

import { cn } from "@/lib/cn";
import {
  buildPredictedEdgeContent,
  dataCompletenessLabel,
  dataCoverageGaps,
  type EdgeTextSegment,
} from "@/lib/analysis-copy";
import { assessDataQuality } from "@/lib/data-quality";
import type { ClientAnalysis } from "@/lib/analysis-payload";
import type { Fighter } from "@/lib/types";
import { CountUpValue, useInViewOnce } from "@/components/ui/CountUp";

export function PredictedEdgePanel({
  fighterA,
  fighterB,
  analysis,
  className,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  analysis: ClientAnalysis;
  className?: string;
}) {
  const predictedA = analysis.predictedWinnerId === fighterA.id;
  const winner = predictedA ? fighterA : fighterB;
  const loser = predictedA ? fighterB : fighterA;
  const content = buildPredictedEdgeContent({
    winner,
    loser,
    shortRead: analysis.shortRead,
    prediction: analysis.prediction,
  });
  const quality =
    analysis.prediction?.coverageLevel ??
    assessDataQuality(fighterA, fighterB);
  const coverage = dataCompletenessLabel(
    quality,
    analysis.prediction?.coverageReasons,
  );
  const gaps = dataCoverageGaps(fighterA, fighterB);
  const { ref: connectorRef, inView: connectorInView } = useInViewOnce<HTMLDivElement>(0.35);

  return (
    <section className={cn("space-y-8", className)}>
      {/* Level 1 — central claim, no steel card */}
      <header className="border-b border-white/[0.06] pb-8 text-center">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
          Predicted edge
        </p>
        <p className="font-display mx-auto mt-4 max-w-3xl text-[1.65rem] leading-[1.15] font-semibold tracking-tight text-ink sm:text-3xl lg:text-[2.15rem]">
          {content.headline}
        </p>
        <DataCoverageBadge short={coverage.short} detail={coverage.detail} gaps={gaps} />
      </header>

      {/* Level 2 — metric-backed reasons (asymmetric Floating Data Glass) */}
      <div>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
            Why the edge
          </p>
          <a
            href="#key-matchup-factors"
            className="text-[11px] text-mute transition-colors hover:text-ink"
          >
            Numbers below ↓
          </a>
        </div>
        <div className="grid items-start gap-4 sm:grid-cols-3 sm:gap-5">
          {content.reasons.map((reason, index) => (
            <a
              key={reason.factorKey}
              href={
                reason.factorKey === "method"
                  ? "#key-matchup-factors"
                  : `#factor-${reason.factorKey}`
              }
              className={cn(
                "fs-glass fs-glass-data group block h-auto border-l-[3px] border-l-accent-fill px-4 py-4",
                index === 0 && "sm:mt-0 sm:scale-[1.03]",
                index === 1 && "sm:mt-8",
                index === 2 && "sm:-mt-4",
              )}
              style={{ viewTransitionName: `edge-reason-${reason.factorKey}` }}
            >
              <p className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
                {reason.title}
              </p>
              <p className="mt-2.5 text-sm leading-6 text-mute">
                <ReasonSegments segments={reason.segments} emphasize={index === 0} />
              </p>
              {reason.kind === "method" ? (
                <div className="mt-3">
                  <MethodPill kind={content.methodKind} label={content.methodLabel} />
                </div>
              ) : null}
            </a>
          ))}
        </div>

        {/* Animated SVG connector into Key matchup factors */}
        <div
          ref={connectorRef}
          className="mt-5 flex flex-col items-center"
          aria-hidden="true"
        >
          <svg width="24" height="48" viewBox="0 0 24 48" className="overflow-visible">
            <path
              d="M12 0 V36 L6 30 M12 36 L18 30"
              fill="none"
              stroke="rgba(199, 54, 54, 0.55)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className={cn("fs-connector-draw", connectorInView && "is-drawn")}
            />
          </svg>
        </div>
      </div>

      {/* Level 3 — scenarios (Floating Data Glass, lighter weight) */}
      <div className="px-0 py-1 sm:px-1 sm:py-2">
        <p className="mb-3 px-2 text-[11px] font-semibold tracking-[0.14em] text-mute/80 uppercase">
          Fight scenarios
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {content.scenarios.map((scenario) => (
            <article
              key={scenario.title}
              className="fs-glass fs-glass-data px-3.5 py-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[12px] font-semibold tracking-wide text-mute uppercase">
                  {scenario.title}
                </h3>
                <MethodPill kind={scenario.method} label={scenario.methodLabel} />
              </div>
              <p className="mt-2 text-[13px] leading-5 text-mute/90">{scenario.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function parseStatNumber(raw: string): { n: number; suffix: string } | null {
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return { n, suffix: m[2] ?? "" };
}

function ReasonSegments({
  segments,
  emphasize = false,
}: {
  segments: EdgeTextSegment[];
  emphasize?: boolean;
}) {
  const { ref, inView } = useInViewOnce<HTMLSpanElement>(0.4);

  return (
    <span ref={ref}>
      {segments.map((seg, i) => {
        if (seg.type !== "stat") {
          return <span key={i}>{seg.value}</span>;
        }
        const parsed = parseStatNumber(seg.value);
        return (
          <span
            key={i}
            className={cn(
              "font-mono tabular-nums",
              emphasize ? "text-[1.35rem] font-semibold leading-none sm:text-2xl" : "text-[13px]",
              seg.advantage ? "font-semibold text-accent" : "text-ink/80",
            )}
          >
            {parsed ? (
              <CountUpValue value={parsed.n} active={inView} suffix={parsed.suffix} />
            ) : (
              seg.value
            )}
          </span>
        );
      })}
    </span>
  );
}

function MethodPill({
  kind,
  label,
}: {
  kind: "decision" | "finish" | "other";
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase",
        kind === "decision" && "bg-tape/20 text-tape",
        kind === "finish" && "bg-accent-fill/20 text-accent",
        kind === "other" && "bg-white/[0.06] text-mute",
      )}
    >
      {label}
    </span>
  );
}

function DataCoverageBadge({
  short,
  detail,
  gaps,
}: {
  short: string;
  detail: string;
  gaps: string[];
}) {
  return (
    <details className="mx-auto mt-4 w-fit max-w-lg text-left">
      <summary className="cursor-pointer list-none text-center text-[11px] text-mute transition-colors hover:text-ink">
        <span className="fs-glass fs-glass-capsule inline-flex items-center gap-1.5 px-3 py-1.5">
          <span aria-hidden="true">ⓘ</span>
          {short}
        </span>
      </summary>
      <div className="fs-glass fs-glass-panel relative mt-2 space-y-1.5 px-3.5 py-3 text-center text-[12px] leading-5 text-mute">
        <p>{detail}</p>
        {gaps.length > 0 ? (
          <ul className="mx-auto max-w-md list-disc space-y-0.5 pl-5 text-left">
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
