"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Light 3D parallax on fighter photos — a few px max, clipped by overflow frame.
 */
export function ParallaxFrame({
  children,
  className,
  strength = 6,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) return;

    const el = ref.current;
    if (!el) return;

    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      setOffset({ x: nx * strength, y: ny * strength });
    };

    const onLeave = () => setOffset({ x: 0, y: 0 });

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);

  return (
    <div ref={ref} className={cn("fs-parallax-frame overflow-hidden", className)}>
      <div
        className="fs-parallax-photo"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(1.04)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
