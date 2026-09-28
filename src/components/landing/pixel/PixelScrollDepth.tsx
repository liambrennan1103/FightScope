"use client";

import { useEffect, useRef, type ReactNode } from "react";

type PixelScrollDepthProps = {
  children: ReactNode;
  className?: string;
  /** Background image lag — higher = farther / slower. */
  bgSpeed?: number;
  /** Foreground content counter-motion — negative = closer. */
  fgSpeed?: number;
  /** Optional mid-layer (e.g. fighter cutouts). */
  midSpeed?: number;
  id?: string;
};

/**
 * Scroll-linked depth: background drifts slower than the section,
 * foreground moves slightly opposite so copy feels nearer than photos.
 * Mark layers with data-scroll-depth="bg" | "mid" | "fg".
 */
export function PixelScrollDepth({
  children,
  className = "",
  bgSpeed = 0.32,
  fgSpeed = -0.07,
  midSpeed = 0.12,
  id,
}: PixelScrollDepthProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bgNodes = [...root.querySelectorAll<HTMLElement>("[data-scroll-depth='bg']")];
    const midNodes = [...root.querySelectorAll<HTMLElement>("[data-scroll-depth='mid']")];
    const fgNodes = [...root.querySelectorAll<HTMLElement>("[data-scroll-depth='fg']")];

    const reset = () => {
      for (const el of [...bgNodes, ...midNodes, ...fgNodes]) {
        el.style.transform = "";
        el.style.willChange = "";
      }
    };

    if (reduced) {
      reset();
      return;
    }

    for (const el of bgNodes) el.style.willChange = "transform";
    for (const el of midNodes) el.style.willChange = "transform";
    for (const el of fgNodes) el.style.willChange = "transform";

    const apply = () => {
      rafRef.current = 0;
      const rect = root.getBoundingClientRect();
      const viewMid = window.innerHeight * 0.5;
      const delta = viewMid - (rect.top + rect.height * 0.5);

      const bgY = delta * bgSpeed;
      const midY = delta * midSpeed;
      const fgY = delta * fgSpeed;

      for (const el of bgNodes) {
        const scale = el.dataset.depthScale || "1.1";
        el.style.transform = `translate3d(0, ${bgY.toFixed(2)}px, 0) scale(${scale})`;
      }
      for (const el of midNodes) {
        el.style.transform = `translate3d(0, ${midY.toFixed(2)}px, 0)`;
      }
      for (const el of fgNodes) {
        el.style.transform = `translate3d(0, ${fgY.toFixed(2)}px, 0)`;
      }
    };

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      reset();
    };
  }, [bgSpeed, fgSpeed, midSpeed]);

  return (
    <section ref={rootRef} className={className} id={id}>
      {children}
    </section>
  );
}
