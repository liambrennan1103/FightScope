"use client";

import { useEffect, useRef } from "react";

type PixelParallaxBackgroundProps = {
  src: string;
  className?: string;
  /** Extra CSS for the outer clip wrapper (absolute placement in pixel layout). */
  style?: React.CSSProperties;
  /** Scroll coupling: ~0.15–0.3 keeps depth subtle. */
  speed?: number;
  opacity?: number;
  alt?: string;
  /** Soft darkening without blur — readability over photography. */
  overlay?: boolean;
  objectPosition?: string;
};

/**
 * Shared cinematic background depth for landing photographic sections.
 * Transform-only; respects prefers-reduced-motion; overflow-clipped to avoid gaps.
 */
export function PixelParallaxBackground({
  src,
  className = "",
  style,
  speed = 0.22,
  opacity = 1,
  alt = "",
  overlay = true,
  objectPosition = "center center",
}: PixelParallaxBackgroundProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef(0);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;

    if (reducedRef.current) {
      img.style.transform = "translate3d(0, 0, 0) scale(1.06)";
      return;
    }

    const apply = () => {
      rafRef.current = 0;
      const rect = wrap.getBoundingClientRect();
      const viewMid = window.innerHeight * 0.5;
      const offset = (viewMid - (rect.top + rect.height * 0.5)) * speed;
      img.style.transform = `translate3d(0, ${offset}px, 0) scale(1.08)`;
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
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [speed]);

  return (
    <div
      ref={wrapRef}
      className={`pixel-parallax-bg ${className}`.trim()}
      style={style}
      aria-hidden={alt ? undefined : true}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="pixel-parallax-bg__img"
        style={{ opacity, objectPosition }}
        draggable={false}
      />
      {overlay ? <div className="pixel-parallax-bg__overlay" /> : null}
    </div>
  );
}
