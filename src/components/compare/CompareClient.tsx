"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AnalysisLoadingPanel,
  useAnalysisProgress,
} from "@/components/fight/AnalysisLoading";
import { AnalysisResultReveal } from "@/components/fight/AnalysisResultReveal";
import { AttributeComparison } from "@/components/fight/AttributeComparison";
import { PhysicalComparison } from "@/components/fight/PhysicalComparison";
import { StatComparison } from "@/components/fight/StatComparison";
import { FighterSelector } from "@/components/fighter/FighterSelector";
import { LockIcon } from "@/components/premium/PremiumLock";
import { PremiumLock } from "@/components/premium/PremiumLock";
import { useAccount } from "@/components/providers/AccountProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { saveAnalysisToHistory } from "@/lib/analysis-history";
import {
  normalizeAnalysisPayload,
  starterToHistoryPrediction,
  type AnalysisApiPayload,
  type ClientAnalysis,
} from "@/lib/analysis-payload";
import {
  analysisStatusLabel,
  type AnalysisStatus,
} from "@/lib/analysis-status";
import { clearCompareDraft, readCompareDraft, writeCompareDraft } from "@/lib/compare-draft";
import { cn } from "@/lib/cn";
import { compareHref, routes } from "@/lib/routes";
import type { Fighter } from "@/lib/types";

export function CompareClient({
  fighters,
  initialA = null,
  initialB = null,
}: {
  fighters: Fighter[];
  initialA?: string | null;
  initialB?: string | null;
}) {
  const router = useRouter();
  const { canAnalyze, isPro } = useAccount();
  const [leftSlug, setLeftSlug] = useState<string | null>(initialA);
  const [rightSlug, setRightSlug] = useState<string | null>(initialB);
  const [status, setStatus] = useState<AnalysisStatus>("NOT_ANALYZED");
  const [analysis, setAnalysis] = useState<ClientAnalysis | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<ClientAnalysis | null>(null);
  const [serverReady, setServerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [cacheHitPresentation, setCacheHitPresentation] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const requestLock = useRef(false);
  const draftHydrated = useRef(false);

  const fighterA = fighters.find((fighter) => fighter.slug === leftSlug) ?? null;
  const fighterB = fighters.find((fighter) => fighter.slug === rightSlug) ?? null;
  const canCompare = Boolean(fighterA && fighterB && fighterA.id !== fighterB.id);
  const hasSelection = Boolean(leftSlug || rightSlug);
  const analyzing = status === "ANALYZING";
  const progress = useAnalysisProgress({
    active: analyzing,
    serverReady: analyzing && serverReady,
    minDurationMs: 5200,
    fastReveal: cacheHitPresentation,
  });

  useEffect(() => {
    if (draftHydrated.current) return;
    draftHydrated.current = true;

    if (initialA || initialB) {
      writeCompareDraft({ aSlug: initialA ?? null, bSlug: initialB ?? null });
      return;
    }

    const draft = readCompareDraft();
    if (!draft.aSlug && !draft.bSlug) return;
    setLeftSlug(draft.aSlug);
    setRightSlug(draft.bSlug);
    router.replace(compareHref(draft.aSlug, draft.bSlug));
  }, [initialA, initialB, router]);

  useEffect(() => {
    if (!analyzing || !progress.complete || !pendingAnalysis) return;
    const pause = window.setTimeout(() => {
      setAnalysis(pendingAnalysis);
      setPendingAnalysis(null);
      setServerReady(false);
      setStatus("ANALYZED");
      requestLock.current = false;
      window.requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }, 280);
    return () => window.clearTimeout(pause);
  }, [analyzing, progress.complete, pendingAnalysis]);

  function resetAnalysis() {
    setStatus("NOT_ANALYZED");
    setAnalysis(null);
    setPendingAnalysis(null);
    setServerReady(false);
    setCacheHitPresentation(false);
    setError(null);
  }

  function syncDraft(nextA: string | null, nextB: string | null) {
    writeCompareDraft({ aSlug: nextA, bSlug: nextB });
    router.replace(compareHref(nextA, nextB));
  }

  function selectA(slug: string | null) {
    setLeftSlug(slug);
    resetAnalysis();
    syncDraft(slug, rightSlug);
  }

  function selectB(slug: string | null) {
    setRightSlug(slug);
    resetAnalysis();
    syncDraft(leftSlug, slug);
  }

  function clearSelection() {
    setLeftSlug(null);
    setRightSlug(null);
    resetAnalysis();
    clearCompareDraft();
    router.replace(compareHref());
  }

  async function runCompare(bypassCache = false) {
    if (!canAnalyze) {
      setShowUpgrade(true);
      return;
    }
    if (!canCompare || !fighterA || !fighterB || requestLock.current || analyzing) return;
    requestLock.current = true;
    setStatus("ANALYZING");
    setAnalysis(null);
    setPendingAnalysis(null);
    setServerReady(false);
    setError(null);
    setShowUpgrade(false);
    setCacheHitPresentation(false);

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fighterAId: fighterA.id,
          fighterBId: fighterB.id,
          rounds: 3,
          isTitle: false,
          division:
            fighterA.division && fighterB.division && fighterA.division === fighterB.division
              ? fighterA.division
              : fighterA.division ?? fighterB.division ?? null,
          bypassCache,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        analysis?: AnalysisApiPayload;
        error?: string;
        code?: string;
        cacheHit?: boolean;
      } | null;

      if (!response.ok) {
        if (response.status === 402 || body?.code === "PLAN_REQUIRED") {
          setShowUpgrade(true);
          setStatus("ERROR");
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
        fightCompleted: false,
      });
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

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Compare"
        title="Fight Analysis"
        description="Select two fighters, then run a FightScope analysis."
        className="mb-0"
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone={statusTone(status)}>{analysisStatusLabel(status)}</StatusChip>
        {!fighterA || !fighterB ? (
          <StatusChip tone="mute">Select both fighters</StatusChip>
        ) : null}
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
        <FighterSelector
          label="Fighter A"
          value={leftSlug}
          fighters={fighters}
          excludeId={fighterB?.id}
          align="left"
          onChange={selectA}
        />
        <div className="flex items-center justify-center py-2 lg:px-1">
          <div className="fs-compare-vs" aria-hidden="true">
            <span>VS</span>
          </div>
        </div>
        <FighterSelector
          label="Fighter B"
          value={rightSlug}
          fighters={fighters}
          excludeId={fighterA?.id}
          align="right"
          onChange={selectB}
        />
      </div>

      {fighterA && fighterB && fighterA.id === fighterB.id ? (
        <p className="text-center text-sm text-mute">Choose two different fighters.</p>
      ) : null}

      {!fighterA || !fighterB ? (
        <p className="text-center text-sm text-mute">
          {!fighterA && !fighterB
            ? "Choose Fighter A and Fighter B to unlock analysis."
            : !fighterA
              ? "Choose Fighter A to complete the matchup."
              : "Choose Fighter B to complete the matchup."}
        </p>
      ) : null}

      {(status === "NOT_ANALYZED" || status === "ERROR") && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
            AI matchup analysis
          </p>
          <Button
            size="lg"
            className={cn(
              canCompare && canAnalyze && "fs-analyze-cta min-w-[12rem] px-8",
              !canAnalyze && "fs-analyze-locked",
            )}
            variant={canCompare ? "primary" : "secondary"}
            disabled={!canCompare || analyzing}
            onClick={() => void runCompare(false)}
          >
            {!canAnalyze ? <LockIcon /> : null}
            Analyze Fight
          </Button>
          {!canAnalyze ? (
            <p className="text-[12px] font-medium text-mute">Starter feature</p>
          ) : null}
          {showUpgrade ? (
            <div className="max-w-md rounded-xl border border-white/[0.1] bg-elevated/80 px-5 py-4 text-center">
              <p className="text-sm font-semibold text-ink">Unlock Analyze Fight</p>
              <p className="mt-2 text-[13px] text-mute">
                Starter includes win probability, predicted edge, and Key Matchup Factors.
              </p>
              <ButtonLink href={routes.pricing} size="sm" className="mt-4">
                View Starter
              </ButtonLink>
            </div>
          ) : null}
          {error ? (
            <div className="max-w-md rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-center">
              <p className="text-sm text-ink">Analysis couldn&apos;t be completed.</p>
              <p className="mt-1 text-[12px] text-mute">
                Your fighter selection is preserved. {error}
              </p>
              <Button
                className="mt-3"
                variant="secondary"
                size="sm"
                disabled={!canCompare}
                onClick={() => void runCompare(false)}
              >
                Try again
              </Button>
            </div>
          ) : null}
          {hasSelection ? (
            <Button variant="ghost" size="sm" disabled={analyzing} onClick={clearSelection}>
              Clear
            </Button>
          ) : null}
        </div>
      )}

      {analyzing && fighterA && fighterB ? (
        <AnalysisLoadingPanel
          fighterA={fighterA}
          fighterB={fighterB}
          progress={progress.progress}
          message={progress.message}
        />
      ) : null}

      {status === "ANALYZED" && fighterA && fighterB && analysis && !analyzing ? (
        <div ref={resultRef} className="space-y-10 scroll-mt-24">
          <AnalysisResultReveal
            fighterA={fighterA}
            fighterB={fighterB}
            analysis={analysis}
          />

          <div className="flex flex-col items-center gap-2">
            {canAnalyze ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={analyzing}
                onClick={() => void runCompare(true)}
              >
                Analyze again
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" disabled={analyzing} onClick={clearSelection}>
              Clear selection
            </Button>
          </div>

          {isPro ? (
            <div className="space-y-10 border-t border-white/[0.06] pt-10">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
                  Matchup data
                </p>
              </div>
              <section>
                <SectionHeader title="Physical" />
                <PhysicalComparison fighterA={fighterA} fighterB={fighterB} />
              </section>
              <section>
                <SectionHeader title="FightScope ratings" />
                <AttributeComparison fighterA={fighterA} fighterB={fighterB} />
              </section>
              <section>
                <SectionHeader title="Statistics" pro />
                <PremiumLock feature="advancedStats">
                  <StatComparison fighterA={fighterA} fighterB={fighterB} />
                </PremiumLock>
              </section>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StatusChip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "accent" | "mute" | "ok" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "mute" && "bg-white/[0.06] text-mute",
        tone === "ok" && "bg-emerald-500/15 text-emerald-300",
        tone === "warn" && "bg-amber-500/15 text-amber-200",
      )}
    >
      {children}
    </span>
  );
}

function statusTone(status: AnalysisStatus): "accent" | "mute" | "ok" | "warn" {
  switch (status) {
    case "ANALYZED":
      return "ok";
    case "ANALYZING":
      return "accent";
    case "ERROR":
    case "STALE":
      return "warn";
    default:
      return "mute";
  }
}
