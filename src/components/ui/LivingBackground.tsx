"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

/**
 * Living mesh background — slow aurora drift (CSS) + light scroll-linked offset.
 * Degrades to a quiet static mesh on small viewports / reduced motion (see globals.css).
 */
export function LivingBackground({ className }: { className?: string }) {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;

    const update = () => {
      raf = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const y = (window.scrollY / max) * 100;
      root.style.setProperty("--fs-scroll-y", `${y.toFixed(2)}`);
      root.style.setProperty("--fs-scroll-x", `${(y * 0.35).toFixed(2)}`);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      root.style.removeProperty("--fs-scroll-y");
      root.style.removeProperty("--fs-scroll-x");
    };
  }, []);

  return (
    <div className={cn("fs-living-bg", className)} aria-hidden="true">
      <div className="fs-living-bg__mesh" />
    </div>
  );
}
