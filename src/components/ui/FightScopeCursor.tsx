"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Document-level FightScope cursor.
 * Enabled only on fine-pointer / hover-capable devices — never on touch-only.
 * Portaled to body so transforms (landing scale) cannot offset tracking.
 */
export function FightScopeCursor({
  targetRef,
}: {
  /** Optional: limit visibility to a region. Omit for document-wide. */
  targetRef?: React.RefObject<HTMLElement | null>;
}) {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(!touch && !reduced);
  }, []);

  useEffect(() => {
    if (!enabled || !mounted) return;
    const cursor = cursorRef.current;
    if (!cursor) return;

    let visible = false;

    const showAt = (x: number, y: number) => {
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      if (!visible) {
        cursor.classList.add("is-visible");
        visible = true;
      }
    };

    const hide = () => {
      if (visible) {
        cursor.classList.remove("is-visible");
        visible = false;
      }
    };

    const isInsideTarget = (x: number, y: number) => {
      const target = targetRef?.current;
      if (!target) return true;
      const rect = target.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const onMove = (event: MouseEvent) => {
      if (!isInsideTarget(event.clientX, event.clientY)) {
        hide();
        return;
      }
      showAt(event.clientX, event.clientY);
    };

    const onLeave = () => hide();

    document.documentElement.classList.add("fs-custom-cursor");
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      document.documentElement.classList.remove("fs-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled, mounted, targetRef]);

  if (!mounted || !enabled) return null;

  return createPortal(
    <div
      ref={cursorRef}
      className="pixel-hero-cursor pixel-hero-cursor--fixed fs-global-cursor"
      aria-hidden="true"
    />,
    document.body,
  );
}

/** @deprecated Prefer FightScopeCursor — kept for hero imports during migration */
export const PixelCustomCursor = FightScopeCursor;
