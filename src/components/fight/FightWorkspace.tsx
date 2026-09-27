"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  MatchupCenterLoader,
  useAnalysisProgress,
} from "@/components/fight/AnalysisLoading";
import { AnalysisResultReveal } from "@/components/fight/AnalysisResultReveal";
import { MatchupVisual } from "@/components/fight/MatchupBoard";
import { LockIcon } from "@/components/premium/PremiumLock";
import { useAccount } from "@/components/providers/AccountProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { findHistoryItem, saveAnalysisToHistory } from "@/lib/analysis-history";
import {
  clientAnalysisFromPrediction,
  normalizeAnalysisPayload,
  starterToHistoryPrediction,
  type AnalysisApiPayload,
  type ClientAnalysis,
} from "@/lib/analysis-payload";
import {
  deriveInitialAnalysisStatus,
  realFightStatusLabel,
  type AnalysisStatus,
} from "@/lib/analysis-status";
import { cn } from "@/lib/cn";
import {
  displayValue,
  formatCompactDate,
  formatHeight,
  formatReach,
  formatRecord,
} from "@/lib/format";
import { routes } from "@/lib/routes";
import type { Fight, Fighter } from "@/lib/types";

export type FightWorkspaceProps = {
  fighterA: Fighter;
  fighterB: Fighter;
  fight: Fight;
  eventName: string;
  eventDate: string;
  eventSlug: string;
  titleLabel?: string | null;
  kicker?: string | null;
};

export function FightWorkspace({
  fighterA,
  fighterB,
  fight,
  eventName,
  eventDate,
  eventSlug,
  titleLabel,
  kicker,
}: FightWorkspaceProps) {
  const { canAnalyze, isPro } = useAccount();
  const completed = fight.status === "completed";
  const [status, setStatus] = useState<AnalysisStatus>("NOT_ANALYZED");
  const [analysis, setAnalysis] = useState<ClientAnalysis | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<ClientAnalysis | null>(null);
  const [serverReady, setServerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [fromHistory, setFromHistory] = useState(false);
  const [historyKind, setHistoryKind] = useState<"pre_fight" | "retrospective" | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const requestLock = useRef(false);

  const [cacheHitPresentation, setCacheHitPresentation] = useState(false);
  const analyzing = status === "ANALYZING";
  const progress = useAnalysisProgress({
    active: analyzing,
    serverReady: analyzing && serverReady,
    minDurationMs: 5200,
    fastReveal: cacheHitPresentation,
  });
  const analysisAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!analyzing) return;
    const el = analysisAnchorRef.current;
    if (!el) return;
    // Align matchup/analysis under sticky app header
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [analyzing]);

  useEffect(() => {
    const saved = findHistoryItem({
      fightSlug: fight.slug,
      fighterAId: fighterA.id,
      fighterBId: fighterB.id,
    });
    if (saved?.prediction) {
      // Free users: never surface FightScope win probabilities from History
      if (!canAnalyze) {
        setAnalysis(null);
        setFromHistory(false);
        setHistoryKind(null);
        setStatus("NOT_ANALYZED");
        setHydrated(true);
        return;
      }
      const restored = clientAnalysisFromPrediction(
        saved.prediction,
        // History may have been Starter — never invent Pro modules from empty fields
        saved.prediction.analysis.howAWins || saved.prediction.analysis.howBWins
          ? "pro"
          : "starter",
        fighterA,
        fighterB,
      );
      // If user is Starter but history was Pro-shaped, still strip for display
      const display =
        !isPro
          ? {
              ...restored,
              tier: "starter" as const,
              prediction: null,
              fightscopeRating: null,
            }
          : restored;
      setAnalysis(display);
      setFromHistory(true);
      setHistoryKind(saved.kind ?? "pre_fight");
      setStatus(deriveInitialAnalysisStatus({ savedPrediction: saved.prediction }));
    } else {
      setStatus("NOT_ANALYZED");
      setAnalysis(null);
      setFromHistory(false);
      setHistoryKind(null);
    }
    setHydrated(true);
  }, [fight.slug, fighterA, fighterB, canAnalyze, isPro]);

  // When circular loader hits 100%, reveal result (shared-element morph when supported)
  useEffect(() => {
    if (!analyzing || !progress.complete || !pendingAnalysis) return;
    const pause = window.setTimeout(() => {
      const apply = () => {
        setAnalysis(pendingAnalysis);
        setPendingAnalysis(null);
        setServerReady(false);
        setStatus("ANALYZED");
        requestLock.current = false;
      };
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => void;
      };
      if (!reduced && typeof doc.startViewTransition === "function") {
        doc.startViewTransition(apply);
      } else {
        apply();
      }
    }, 280);
    return () => window.clearTimeout(pause);
  }, [analyzing, progress.complete, pendingAnalysis]);

  async function runAnalyze(bypassCache: boolean) {
    if (!canAnalyze) {
      setShowUpgrade(true);
      return;
    }
    if (requestLock.current || status === "ANALYZING") return;
    requestLock.current = true;
    setStatus("ANALYZING");
    setError(null);
    setServerReady(false);
    setPendingAnalysis(null);
    setShowUpgrade(false);
    setCacheHitPresentation(false);

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fighterAId: fighterA.id,
          fighterBId: fighterB.id,
          rounds: fight.rounds,
          isTitle: fight.isTitle,
          division: fight.division,
          bypassCache,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        analysis?: AnalysisApiPayload;
        prediction?: never;
        error?: string;
        code?: string;
        cacheHit?: boolean;
      } | null;

      if (!response.ok) {
        if (response.status === 402 || body?.code === "PLAN_REQUIRED") {
          setShowUpgrade(true);
          setStatus(analysis ? "ANALYZED" : "ERROR");
          requestLock.current = false;
          return;
        }
        throw new Error(body?.error ?? "Analysis request failed");
      }
      if (!body?.analysis) throw new Error(body?.error ?? "Missing analysis");

      const normalized = normalizeAnalysisPayload(body.analysis, fighterA, fighterB);
      saveAnalysisToHistory({
        fighterA,
        fighterB,
        prediction: starterToHistoryPrediction(normalized, fighterA, fighterB),
        eventName,
        eventDate,
        fightSlug: fight.slug,
        division: fight.division,
        rounds: fight.rounds,
        fightCompleted: completed,
      });
      setFromHistory(false);
      setHistoryKind(completed ? "retrospective" : "pre_fight");
      setCacheHitPresentation(Boolean(body.cacheHit));
      setPendingAnalysis(normalized);
      setServerReady(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Fight analysis failed. Try again.");
      setStatus(analysis ? "ANALYZED" : "ERROR");
      setServerReady(false);
      setPendingAnalysis(null);
      requestLock.current = false;
    }
  }

  const showPrediction = status === "ANALYZED" && Boolean(analysis);
  const hasPreFightArchive = fromHistory && historyKind === "pre_fight";
  const analyzeLabel = completed ? "Run retrospective analysis" : "Analyze Fight";
  const analyzeHint = !canAnalyze
    ? "Starter feature — unlock win probabilities and Key Matchup Factors."
    : completed && !hasPreFightArchive
      ? "No pre-fight FightScope analysis was saved for this fight. A new run is retrospective only — not an original pre-fight pick."
      : completed
        ? "A saved pre-fight archive already exists. A new run is stored separately as retrospective and will not rewrite the original."
        : "FightScope has not analyzed this matchup yet.";

  return (
    <div className="space-y-10 sm:space-y-12">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={completed ? "mute" : "amber"}>
            {realFightStatusLabel(fight.status)}
          </StatusChip>
          {fromHistory && status === "ANALYZED" ? (
            <StatusChip tone="mute">
              {historyKind === "retrospective"
                ? "Retrospective run"
                : "Saved pre-fight analysis"}
            </StatusChip>
          ) : null}
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
            {eventName}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {fighterA.lastName} vs {fighterB.lastName}
          </h1>
          <p className="mt-2 text-sm text-mute">
            {[
              formatCompactDate(eventDate),
              fight.division,
              fight.isTitle ? titleLabel ?? "Title" : null,
              `${fight.rounds} rounds`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </header>

      {completed && fight.outcome ? (
        <p className="rounded-xl border border-white/[0.06] bg-surface px-4 py-3 text-sm text-mute">
          <span className="font-semibold text-ink">Official result · </span>
          {fight.outcome.winnerId === fighterA.id
            ? fighterA.name
            : fight.outcome.winnerId === fighterB.id
              ? fighterB.name
              : "Draw"}
          {fight.outcome.method ? ` · ${fight.outcome.method}` : ""}
          {fight.outcome.round ? ` · R${fight.outcome.round}` : ""}
          {fight.outcome.time ? ` · ${fight.outcome.time}` : ""}
          {status === "ANALYZED" && historyKind === "pre_fight" ? (
            <span className="mt-1 block text-[12px] text-mute">
              FightScope take below is the original saved pre-fight analysis — not hindsight.
            </span>
          ) : null}
          {status === "ANALYZED" && historyKind === "retrospective" ? (
            <span className="mt-1 block text-[12px] text-mute">
              FightScope take below is a retrospective run — not an original pre-fight prediction.
            </span>
          ) : null}
          {status !== "ANALYZED" ? (
            <span className="mt-1 block text-[12px] text-mute">
              No pre-fight FightScope analysis was saved for this fight.
            </span>
          ) : null}
        </p>
      ) : null}

      <div ref={analysisAnchorRef} className="scroll-mt-24 sm:scroll-mt-28">
        <MatchupVisual
          fighterA={fighterA}
          fighterB={fighterB}
          drawPct={showPrediction && analysis ? analysis.drawPct : 0}
          prediction={
            showPrediction && analysis
              ? {
                  fighterAWinPct: analysis.fighterAWinPct,
                  fighterBWinPct: analysis.fighterBWinPct,
                  predictedWinnerId: analysis.predictedWinnerId,
                  confidence: analysis.confidence,
                  methods: analysis.engine.methods,
                  analysis: analysis.prediction?.analysis ?? {
                    fightscopeRead: analysis.shortRead ?? "",
                    howAWins: "",
                    howBWins: "",
                  },
                  keyAdvantages: analysis.prediction?.keyAdvantages ?? {
                    fighterA: analysis.keyMatchupFactors.slice(0, 2),
                    fighterB: [],
                  },
                  jointOutcomes: analysis.engine.jointOutcomes,
                  topFactors: analysis.engine.topFactors,
                  mostLikelyPath: analysis.engine.mostLikelyPath,
                }
              : undefined
          }
          eventName={eventName}
          date={eventDate}
          division={fight.division}
          rounds={fight.rounds}
          titleLabel={fight.isTitle ? titleLabel ?? "Title" : null}
          kicker={kicker ?? (completed ? "Completed" : "Matchup")}
          variant="hero"
          showPick={showPrediction}
          showPrediction={showPrediction}
          analyzing={analyzing}
          centerSlot={
            analyzing ? (
              <MatchupCenterLoader
                progress={progress.progress}
                message={progress.message}
              />
            ) : undefined
          }
        />
      </div>

      {(status === "NOT_ANALYZED" || status === "ERROR") && (
        <BasicMatchupFacts fighterA={fighterA} fighterB={fighterB} />
      )}

      {hydrated && (status === "NOT_ANALYZED" || status === "ERROR") ? (
        <div
          className="flex flex-col items-center gap-3 py-2"
          style={{ viewTransitionName: "fs-analysis-morph" }}
        >
          <p className="text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
            FightScope matchup analysis
          </p>
          <Button
            size="lg"
            className={cn("fs-analyze-cta min-w-[12rem] px-8", !canAnalyze && "fs-analyze-locked")}
            disabled={analyzing}
            onClick={() => void runAnalyze(false)}
          >
            {!canAnalyze ? <LockIcon /> : null}
            {analyzeLabel}
          </Button>
          {!canAnalyze ? (
            <p className="text-[12px] font-medium text-mute">Starter feature</p>
          ) : null}
          <p className="max-w-sm text-center text-[12px] text-mute">{analyzeHint}</p>
          {showUpgrade ? (
            <UpgradePanel onClose={() => setShowUpgrade(false)} />
          ) : null}
          {error ? (
            <div className="mt-1 max-w-md rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-center">
              <p className="text-sm text-ink">Analysis couldn&apos;t be completed.</p>
              <p className="mt-1 text-[12px] text-mute">
                Your matchup selection is preserved. {error}
              </p>
              <Button
                className="mt-3"
                variant="secondary"
                size="sm"
                onClick={() => void runAnalyze(false)}
              >
                Try again
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {status === "ANALYZED" && analysis && !analyzing ? (
        <>
          <div style={{ viewTransitionName: "fs-analysis-morph" }}>
            <AnalysisResultReveal
              fighterA={fighterA}
              fighterB={fighterB}
              analysis={analysis}
              historical={completed}
            />
          </div>
          {canAnalyze ? (
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={analyzing}
                onClick={() => void runAnalyze(true)}
              >
                {completed ? "Run retrospective analysis" : "Analyze again"}
              </Button>
              <p className="text-[11px] text-mute">
                {completed
                  ? "Stores a separate retrospective run. Original pre-fight archives stay immutable."
                  : "Creates a new versioned archive. Prior pre-fight saves are kept."}
              </p>
              {error ? <p className="text-sm text-accent">{error}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}

      <p className="text-center text-xs text-mute">
        <Link href={routes.event(eventSlug)} className="hover:text-ink">
          {eventName}
        </Link>
      </p>
    </div>
  );
}

function UpgradePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-2 max-w-md rounded-xl border border-white/[0.1] bg-elevated/80 px-5 py-4 text-center">
      <p className="text-sm font-semibold text-ink">Unlock Analyze Fight</p>
      <p className="mt-2 text-[13px] leading-6 text-mute">
        Starter includes win probability, predicted edge, and Key Matchup Factors.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <ButtonLink href={routes.pricing} size="sm">
          View Starter
        </ButtonLink>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Not now
        </Button>
      </div>
    </div>
  );
}

function BasicMatchupFacts({
  fighterA,
  fighterB,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
}) {
  return (
    <section>
      <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
        Matchup data
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <FactCard fighter={fighterA} />
        <FactCard fighter={fighterB} />
      </div>
    </section>
  );
}

function FactCard({ fighter }: { fighter: Fighter }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface/80 px-4 py-3">
      <p className="text-sm font-semibold text-ink">{fighter.name}</p>
      <p className="mt-1 text-[12px] text-mute">{formatRecord(fighter.record)}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
        <div>
          <dt className="text-mute">Age</dt>
          <dd className="text-ink">{displayValue(fighter.age)}</dd>
        </div>
        <div>
          <dt className="text-mute">Stance</dt>
          <dd className="text-ink">{displayValue(fighter.stance)}</dd>
        </div>
        <div>
          <dt className="text-mute">Height</dt>
          <dd className="text-ink">{formatHeight(fighter.heightCm)}</dd>
        </div>
        <div>
          <dt className="text-mute">Reach</dt>
          <dd className="text-ink">{formatReach(fighter.reachCm)}</dd>
        </div>
      </dl>
    </div>
  );
}

function StatusChip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "accent" | "mute" | "ok" | "warn" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "mute" && "bg-white/[0.06] text-mute",
        tone === "ok" && "bg-emerald-500/15 text-emerald-300",
        tone === "warn" && "bg-amber-500/15 text-amber-200",
        tone === "amber" && "bg-amber/15 text-amber",
      )}
    >
      {children}
    </span>
  );
}
