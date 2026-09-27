"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { cn } from "@/lib/cn";
import type { Fighter } from "@/lib/types";

const LOADING_MESSAGES = [
  "Comparing fighter profiles",
  "Evaluating matchup dynamics",
  "Analyzing stylistic advantages",
  "Calculating win probability",
  "Finalizing prediction",
] as const;

/**
 * Visual analysis progress (not literal Anthropic completion %).
 * Holds near 94% until `serverReady`, then completes to 100%.
 * `fastReveal` shortens the hold for cache hits without restarting the ring.
 */
export function useAnalysisProgress(opts: {
  active: boolean;
  serverReady: boolean;
  minDurationMs?: number;
  /** Cache-hit presentation — finish sooner once server is ready. */
  fastReveal?: boolean;
}): { progress: number; complete: boolean; message: string } {
  const minDurationMs = opts.minDurationMs ?? 5000;
  const fastReveal = Boolean(opts.fastReveal);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const startedAt = useRef(0);
  const readyAt = useRef<number | null>(null);
  const raf = useRef(0);
  const fastRef = useRef(fastReveal);
  fastRef.current = fastReveal;

  useEffect(() => {
    if (!opts.active) {
      setProgress(0);
      setComplete(false);
      setMessageIndex(0);
      readyAt.current = null;
      if (raf.current) cancelAnimationFrame(raf.current);
      return;
    }

    startedAt.current = performance.now();
    readyAt.current = null;
    setComplete(false);
    setProgress(0);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = (now: number) => {
      const elapsed = now - startedAt.current;
      const targetMin = fastRef.current ? Math.min(minDurationMs, 3200) : minDurationMs;
      let next = mapElapsedToProgress(elapsed, targetMin);

      if (opts.serverReady) {
        if (readyAt.current == null) readyAt.current = now;
        const sinceReady = now - readyAt.current;
        const minReached = elapsed >= targetMin * 0.92;
        if (minReached) {
          const finishT = Math.min(1, sinceReady / 450);
          next = 94 + 6 * easeOutCubic(finishT);
          if (finishT >= 1) {
            setProgress(100);
            setComplete(true);
            return;
          }
        } else {
          next = Math.min(next, 94);
        }
      } else {
        next = Math.min(next, 94);
      }

      if (reduced) {
        next = opts.serverReady && elapsed > 800 ? 100 : Math.min(90, elapsed / 40);
        if (next >= 100) {
          setProgress(100);
          setComplete(true);
          return;
        }
      }

      setProgress(next);
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [opts.active, opts.serverReady, minDurationMs]);

  useEffect(() => {
    if (!opts.active) return;
    const id = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, [opts.active]);

  return {
    progress: Math.round(progress),
    complete,
    message: LOADING_MESSAGES[messageIndex] ?? LOADING_MESSAGES[0],
  };
}

function mapElapsedToProgress(elapsed: number, minMs: number): number {
  // Piecewise visual curve toward ~94% over minDuration
  const t = elapsed / minMs;
  if (t < 0.18) return (t / 0.18) * 25;
  if (t < 0.45) return 25 + ((t - 0.18) / 0.27) * 35;
  if (t < 0.72) return 60 + ((t - 0.45) / 0.27) * 22;
  if (t < 1) return 82 + ((t - 0.72) / 0.28) * 12;
  return 94;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function AnalysisLoadingPanel({
  fighterA,
  fighterB,
  progress,
  message,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  progress: number;
  message: string;
}) {
  return (
    <div
      className="fs-analyze-loading relative overflow-hidden rounded-xl border border-white/[0.08] bg-surface px-5 py-8 sm:px-8"
      aria-live="polite"
      aria-busy="true"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      role="progressbar"
    >
      <div className="fs-analyze-scan pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex w-full max-w-md items-center justify-between gap-4">
          <LoadingPortrait fighter={fighterA} align="left" />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-mute">VS</span>
          <LoadingPortrait fighter={fighterB} align="right" />
        </div>

        <CircularProgress value={progress} />

        <div className="text-center">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
            Analyzing matchup
          </p>
          <p className="mt-2 text-sm text-mute transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingPortrait({
  fighter,
  align,
}: {
  fighter: Fighter;
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2", align === "right" && "items-center")}>
      <div className="fs-analyze-portrait-ring rounded-xl p-0.5">
        <FighterPortrait
          fighter={fighter}
          name={fighter.name}
          portrait={fighter.portrait}
          variant="medium"
        />
      </div>
      <p className="max-w-[7rem] truncate text-center text-[12px] font-medium text-ink">
        {fighter.lastName}
      </p>
    </div>
  );
}

export function CircularProgress({
  value,
  size = 148,
}: {
  value: number;
  size?: number;
}) {
  const reactId = useId().replace(/:/g, "");
  const stroke = size < 120 ? 7 : 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - clamped / 100);
  const gradientId = `fs-progress-stroke-${reactId}`;

  return (
    <div className="fs-circular-loader relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 120ms linear" }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e85d3a" />
            <stop offset="85%" stopColor="#c42f2f" />
            <stop offset="100%" stopColor="#ff8a6a" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "tabular font-semibold tracking-tight text-ink",
            size < 120 ? "text-2xl" : "text-3xl sm:text-4xl",
          )}
        >
          {Math.round(clamped)}%
        </span>
      </div>
    </div>
  );
}

/** Compact loader for the matchup VS slot during analysis. */
export function MatchupCenterLoader({
  progress,
  message,
}: {
  progress: number;
  message: string;
}) {
  return (
    <div
      className="flex min-w-[8.5rem] flex-col items-center justify-center px-1 lg:min-w-[11rem]"
      aria-live="polite"
      aria-busy="true"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <CircularProgress value={progress} size={112} />
      <p className="mt-3 text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
        Analyzing matchup
      </p>
      <p className="mt-1 max-w-[9rem] text-center text-[11px] leading-4 text-mute">{message}</p>
    </div>
  );
}

/** Animate win % from 0 → final value (ease-out, ~2.1s). */
export function AnimatedWinPct({
  value,
  active,
  className,
  emphasize,
  durationMs = 2100,
}: {
  value: number;
  active: boolean;
  className?: string;
  emphasize?: boolean;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) {
      setDisplay(0);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Stronger ease-out so the last stretch decelerates
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [active, value, durationMs]);

  return (
    <span
      className={cn(
        "tabular font-semibold leading-none",
        emphasize ? "text-accent" : "text-mute",
        className,
      )}
    >
      {display}%
    </span>
  );
}
