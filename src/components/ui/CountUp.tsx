"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { pct } from "@/lib/format";

const EASE = (t: number) => {
  // cubic-bezier(0.16, 1, 0.3, 1) approximation
  return 1 - Math.pow(1 - t, 4);
};

export function useInViewOnce<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export function useCountUp(target: number, active: boolean, duration = 1000) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active) {
      setShown(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(Math.round(target));
      return;
    }

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(target * EASE(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration]);

  return shown;
}

export function CountUpPct({
  value,
  active,
  className,
  durationMs = 2200,
}: {
  value: number;
  active: boolean;
  className?: string;
  durationMs?: number;
}) {
  const shown = useCountUp(value, active, durationMs);
  return <span className={cn("font-mono tabular-nums", className)}>{pct(shown)}</span>;
}

export function CountUpValue({
  value,
  active,
  suffix = "",
  className,
}: {
  value: number;
  active: boolean;
  suffix?: string;
  className?: string;
}) {
  const shown = useCountUp(value, active, 1000);
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {shown}
      {suffix}
    </span>
  );
}
