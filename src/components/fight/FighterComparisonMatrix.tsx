"use client";

import { useId, useMemo, useState } from "react";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { cn } from "@/lib/cn";
import {
  buildComparisonRows,
  domainVerdict,
  edgeMagnitudeLabel,
  groupRowsByDomain,
  modelScoreTooltip,
  pickDefaultMetricRows,
  type ComparisonDomain,
  type ComparisonRow,
  type DomainVerdict,
} from "@/lib/analysis-metrics";
import type { Fighter, PredictionFactor } from "@/lib/types";

export function FighterComparisonMatrix({
  fighterA,
  fighterB,
  topFactors = [],
  active = true,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  topFactors?: PredictionFactor[];
  active?: boolean;
}) {
  const rows = useMemo(() => buildComparisonRows(fighterA, fighterB), [fighterA, fighterB]);
  const groups = useMemo(() => groupRowsByDomain(rows), [rows]);
  const factorKeys = useMemo(() => topFactors.map((f) => f.factor), [topFactors]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (groups.length === 0) return null;

  return (
    <section
      id="analysis-stats"
      className="scroll-mt-[var(--fs-scroll-margin,5.5rem)] space-y-6"
    >
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
          Evidence
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Fighter comparison
        </h2>
        <p className="mt-1 max-w-xl text-[13px] text-mute">
          Category verdict first, then the key verified stats. Expand for the full tape.
        </p>
      </div>

      <div className="overflow-visible rounded-2xl border border-white/[0.08] bg-[#0c0c10]">
        {/* Sticky identity — sits under glass chrome; accordion headers stick below this */}
        <div
          className={cn(
            "grid grid-cols-2 border-b border-white/[0.08] bg-[#0c0c10]/92 backdrop-blur-sm",
            "sticky top-[var(--fs-chrome-offset,4.25rem)] z-[20]",
          )}
        >
          <FighterColHeader fighter={fighterA} side="left" />
          <FighterColHeader fighter={fighterB} side="right" />
        </div>

        {groups.map((group, gi) => (
          <DomainAccordion
            key={group.domain}
            group={group}
            factorKeys={factorKeys}
            fighterA={fighterA}
            fighterB={fighterB}
            expanded={Boolean(expanded[group.domain])}
            onToggle={() =>
              setExpanded((prev) => ({
                ...prev,
                [group.domain]: !prev[group.domain],
              }))
            }
            delay={gi * 50}
            active={active}
          />
        ))}
      </div>
    </section>
  );
}

function DomainAccordion({
  group,
  factorKeys,
  fighterA,
  fighterB,
  expanded,
  onToggle,
  delay,
  active,
}: {
  group: { domain: ComparisonDomain; title: string; rows: ComparisonRow[] };
  factorKeys: string[];
  fighterA: Fighter;
  fighterB: Fighter;
  expanded: boolean;
  onToggle: () => void;
  delay: number;
  active: boolean;
}) {
  const panelId = useId();
  const defaults = pickDefaultMetricRows(group.domain, group.rows, factorKeys, 3);
  const defaultIds = new Set(defaults.map((r) => r.id));
  const hasMore = group.rows.length > defaults.length;
  const shown = expanded || !hasMore ? group.rows : defaults;
  const isModel = group.domain === "model";
  const visible = isModel ? (expanded ? group.rows : []) : shown;
  const canToggle = isModel ? group.rows.length > 0 : hasMore;
  const verdict = domainVerdict(group.rows, fighterA, fighterB);

  return (
    <div
      className={cn(
        "border-b border-white/[0.06] last:border-b-0",
        active && "fs-compare-section",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        type="button"
        className={cn(
          "sticky z-[15] flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3",
          "top-[calc(var(--fs-chrome-offset,4.25rem)+var(--fs-compare-header-h,3rem))] ",
          "border-b border-white/[0.04] bg-[#0c0c10]/95 px-4 py-3.5 text-left backdrop-blur-sm sm:px-5",
          "transition-colors hover:bg-white/[0.04]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
          !canToggle && "cursor-default hover:bg-transparent",
        )}
        onClick={() => {
          if (canToggle) onToggle();
        }}
        aria-expanded={canToggle ? expanded : undefined}
        aria-controls={canToggle ? panelId : undefined}
        disabled={!canToggle}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-[12px] font-semibold tracking-[0.14em] text-ink uppercase">
              {group.title}
            </p>
            {!isModel ? <VerdictChip verdict={verdict} /> : null}
            {isModel ? <ModelScoreInfo /> : null}
          </div>
          <p className="mt-1 text-[12px] text-mute">
            {isModel
              ? expanded
                ? `${group.rows.length} FightScope scores`
                : `${group.rows.length} model scores hidden`
              : expanded || !hasMore
                ? `${group.rows.length} metrics`
                : `${defaults.length} key metrics shown`}
          </p>
        </div>
        {canToggle ? (
          <span
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3.5 py-2",
              "text-[11px] font-semibold tracking-[0.1em] text-ink uppercase",
              "transition-colors group-hover:border-accent/50",
            )}
          >
            {expanded
              ? "Collapse"
              : isModel
                ? "View scores"
                : `View all ${group.rows.length}`}
            <Chevron open={expanded} />
          </span>
        ) : null}
      </button>

      <div
        id={panelId}
        role="region"
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          visible.length > 0 ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          {visible.length > 0 ? (
            <div className="divide-y divide-white/[0.04] px-2 pb-4 sm:px-3">
              {visible.map((row, ri) => (
                <MetricRow
                  key={row.id}
                  row={row}
                  delay={ri * 30}
                  active={active}
                  emphasized={defaultIds.has(row.id) && !isModel}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VerdictChip({ verdict }: { verdict: DomainVerdict }) {
  if (verdict.edge === "neutral") {
    return <span className="text-[11px] font-medium tracking-normal text-mute normal-case">Even</span>;
  }
  return (
    <span
      className={cn(
        "text-[11px] font-semibold tracking-normal normal-case",
        verdict.magnitude === "strong" || verdict.magnitude === "clear"
          ? "text-accent"
          : "text-ink/80",
      )}
    >
      {verdict.summary}
    </span>
  );
}

function ModelScoreInfo() {
  const tip =
    "Composite FightScope scores derived from verified statistics and normalized within the prediction model — not official UFC percentages.";
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.12] text-[10px] text-mute hover:text-ink"
      title={tip}
      aria-label={tip}
    >
      ⓘ
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className={cn(
        "text-accent transition-transform duration-300 ease-out",
        open ? "rotate-180" : "rotate-0",
      )}
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5 L6 8 L9.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FighterColHeader({
  fighter,
  side,
}: {
  fighter: Fighter;
  side: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex h-12 items-center gap-2.5 px-3 sm:h-[3rem] sm:gap-3 sm:px-4",
        side === "right" && "flex-row-reverse border-l border-white/[0.08] text-right",
      )}
    >
      <FighterPortrait
        fighter={fighter}
        name={fighter.name}
        portrait={fighter.portrait}
        variant="thumb"
      />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold tracking-tight text-ink sm:text-sm">
          {fighter.name}
        </p>
        <p className="hidden text-[10px] tracking-[0.08em] text-mute uppercase sm:block">
          {fighter.lastName}
        </p>
      </div>
    </div>
  );
}

function MetricRow({
  row,
  delay,
  active,
  emphasized,
}: {
  row: ComparisonRow;
  delay: number;
  active: boolean;
  emphasized?: boolean;
}) {
  const leftEdge = row.edge === "fighterA" && row.magnitude !== "negligible";
  const rightEdge = row.edge === "fighterB" && row.magnitude !== "negligible";
  const strong = row.magnitude === "clear" || row.magnitude === "strong";
  const scoreKey = row.id.startsWith("model-") ? row.id.replace("model-", "") : "";
  const tip =
    row.kind === "model" && scoreKey
      ? modelScoreTooltip(scoreKey)
      : row.tooltip;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 px-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,auto)_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-2",
        active && "fs-metric-reveal",
        emphasized && "bg-white/[0.015]",
      )}
      style={{ animationDelay: `${delay}ms` }}
      title={tip}
    >
      <div className="sm:hidden">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-mute uppercase">
          {row.label}
          {row.kind === "model" ? (
            <span className="ml-2 font-normal normal-case tracking-normal text-mute/60">
              FightScope score
            </span>
          ) : null}
        </p>
        <div className="mt-2.5 flex items-baseline justify-between gap-4">
          <p
            className={cn(
              "text-[15px] font-semibold tabular-nums",
              leftEdge ? (strong ? "text-accent" : "text-ink") : "text-ink/75",
            )}
          >
            {row.left}
          </p>
          <p
            className={cn(
              "text-[15px] font-semibold tabular-nums",
              rightEdge ? (strong ? "text-accent" : "text-ink") : "text-ink/75",
            )}
          >
            {row.right}
          </p>
        </div>
        {row.leftNum != null && row.rightNum != null ? (
          <ComparisonBar row={row} className="mt-2.5" />
        ) : null}
      </div>

      <p
        className={cn(
          "hidden min-w-0 truncate text-[15px] font-semibold tabular-nums sm:block sm:text-right",
          leftEdge ? (strong ? "text-accent" : "text-ink") : "text-ink/75",
        )}
      >
        {row.left}
      </p>

      <div className="hidden text-center sm:block">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-mute uppercase">
          {row.label}
          {row.kind === "model" ? (
            <button
              type="button"
              className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/[0.12] text-[9px] text-mute hover:text-ink"
              title={tip}
              aria-label={tip}
              onClick={(e) => e.stopPropagation()}
            >
              ⓘ
            </button>
          ) : null}
        </p>
        {row.kind === "model" ? (
          <p className="mt-0.5 text-[10px] text-mute/55">FightScope score</p>
        ) : null}
        {row.edge !== "neutral" && row.magnitude !== "negligible" ? (
          <p className="mt-0.5 text-[10px] text-mute/70">{edgeMagnitudeLabel(row.magnitude)}</p>
        ) : null}
      </div>

      <p
        className={cn(
          "hidden min-w-0 truncate text-[15px] font-semibold tabular-nums sm:block sm:text-left",
          rightEdge ? (strong ? "text-accent" : "text-ink") : "text-ink/75",
        )}
      >
        {row.right}
      </p>

      {row.leftNum != null && row.rightNum != null ? (
        <ComparisonBar row={row} className="hidden sm:col-span-3 sm:mt-1.5 sm:grid" />
      ) : null}
    </div>
  );
}

function ComparisonBar({ row, className }: { row: ComparisonRow; className?: string }) {
  if (row.leftNum == null || row.rightNum == null) return null;
  const a = Math.abs(row.leftNum);
  const b = Math.abs(row.rightNum);
  const max = Math.max(a, b, 0.0001);
  const aPct = Math.min(100, (a / max) * 100);
  const bPct = Math.min(100, (b / max) * 100);
  const aAccent = row.edge === "fighterA" && row.magnitude !== "negligible";
  const bAccent = row.edge === "fighterB" && row.magnitude !== "negligible";

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <div className="flex justify-end">
        <div className="h-1 w-full max-w-[9rem] overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn(
              "ml-auto h-full rounded-full transition-[width] duration-700 ease-out",
              aAccent ? "bg-accent" : "bg-white/25",
            )}
            style={{ width: `${aPct}%` }}
          />
        </div>
      </div>
      <div className="flex justify-start">
        <div className="h-1 w-full max-w-[9rem] overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              bAccent ? "bg-accent" : "bg-white/25",
            )}
            style={{ width: `${bPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
