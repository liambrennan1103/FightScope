"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useState,
  type Attributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type RevealChild = ReactElement<{ className?: string; style?: React.CSSProperties }>;

export function PixelReveal({
  children,
  className,
  delayMs = 0,
  offsetY = 15,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  offsetY?: number;
}) {
  const revealId = useId().replace(/:/g, "");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-pixel-reveal="${revealId}"]`);
    if (!el) return;

    const show = () => setVisible(true);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
    );
    observer.observe(el);
    const fallback = window.setTimeout(show, 900);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [revealId]);

  const child = Children.only(children);
  if (!isValidElement(child)) return <>{children}</>;

  const revealChild = child as RevealChild;

  return cloneElement(revealChild, {
    "data-pixel-reveal": revealId,
    className: cn(revealChild.props.className, "pixel-reveal", visible && "pixel-reveal--visible", className),
    style: {
      ...revealChild.props.style,
      transitionDelay: visible ? `${delayMs}ms` : undefined,
      ["--pixel-reveal-y" as string]: `${offsetY}px`,
    },
  } as Attributes & RevealChild["props"] & { "data-pixel-reveal": string });
}
