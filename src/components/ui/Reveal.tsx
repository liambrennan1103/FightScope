"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Fade/rise when the block enters the viewport (once). Falls back to visible if IO never fires. */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setVisible(true);
      return;
    }

    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setVisible(true);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
    );

    observer.observe(el);
    // Above-the-fold / automation safety — never leave content permanently hidden.
    const fallback = window.setTimeout(show, 700);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "fs-reveal-ready transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0",
        className,
      )}
      style={visible && delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
