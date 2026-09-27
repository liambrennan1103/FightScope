"use client";

import { useEffect, useRef, useState } from "react";
import { LandingTapeBar } from "@/components/landing/LandingTapeBar";
import { pct } from "@/lib/format";
import { cn } from "@/lib/cn";

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

export function CountUpPct({
  value,
  active,
  className,
}: {
  value: number;
  active: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(Math.round(value));
      return;
    }
    const target = Math.round(value);
    const start = performance.now();
    const duration = 1000;
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, value]);

  return <span className={cn("font-mono tabular-nums", className)}>{pct(shown)}</span>;
}

export function LandingAnimatedBar({
  leftPct,
  active,
  className,
}: {
  leftPct: number;
  predictedSide?: "left" | "right";
  active: boolean;
  className?: string;
}) {
  return <LandingTapeBar leftPct={leftPct} active={active} className={className} />;
}
