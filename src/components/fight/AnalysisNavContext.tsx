"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AnalysisNavSection = {
  id: string;
  label: string;
};

export const ANALYSIS_NAV_SECTIONS: AnalysisNavSection[] = [
  { id: "analysis-overview", label: "Overview" },
  { id: "analysis-why", label: "Why" },
  { id: "analysis-stats", label: "Stats" },
  { id: "analysis-method", label: "Method" },
  { id: "analysis-scenarios", label: "Scenarios" },
  { id: "analysis-sources", label: "Sources" },
];

/** ProductTopBar: pt-3 (0.75rem) + h-14 (3.5rem) */
export const FS_CHROME_OFFSET = "4.25rem";
/** Compact dual-fighter sticky row */
export const FS_COMPARE_HEADER_H = "3rem";

type AnalysisNavContextValue = {
  sections: AnalysisNavSection[];
  activeId: string;
  docked: boolean;
  active: boolean;
  goTo: (id: string) => void;
  registerSentinel: (el: HTMLElement | null) => void;
  setActiveSession: (on: boolean) => void;
};

const AnalysisNavContext = createContext<AnalysisNavContextValue | null>(null);

function scrollMarginPx(): number {
  if (typeof window === "undefined") return 88;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--fs-scroll-margin")
    .trim();
  if (raw.endsWith("rem")) return parseFloat(raw) * 16;
  if (raw.endsWith("px")) return parseFloat(raw);
  return 88;
}

export function AnalysisNavProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState(ANALYSIS_NAV_SECTIONS[0]?.id ?? "");
  const [docked, setDocked] = useState(false);
  const [active, setActive] = useState(false);
  const [sentinelEl, setSentinelEl] = useState<HTMLElement | null>(null);
  const sections = ANALYSIS_NAV_SECTIONS;

  const setActiveSession = useCallback((on: boolean) => {
    setActive(on);
    if (!on) {
      setDocked(false);
      setActiveId(ANALYSIS_NAV_SECTIONS[0]?.id ?? "");
    }
  }, []);

  const goTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = scrollMarginPx();
    const y = window.scrollY + el.getBoundingClientRect().top - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    setActiveId(id);
    try {
      history.replaceState(null, "", `#${id}`);
    } catch {
      /* ignore */
    }
  }, []);

  const registerSentinel = useCallback((el: HTMLElement | null) => {
    setSentinelEl(el);
  }, []);

  // Dock when the inline sentinel leaves the area below the glass chrome.
  useEffect(() => {
    if (!active || !sentinelEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Dock only after the sentinel has scrolled up under the glass chrome.
        // If the sentinel is still below the fold (tall hero), keep inline/undocked.
        const next = entry.boundingClientRect.top < 68;
        setDocked((prev) => (prev === next ? prev : next));
      },
      {
        root: null,
        rootMargin: "0px 0px 0px 0px",
        threshold: [0, 0.01, 1],
      },
    );

    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [active, sentinelEl]);

  // Active section via IntersectionObserver (one observer, multi-target)
  useEffect(() => {
    if (!active) return;
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!elements.length) return;

    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        const margin = scrollMarginPx();
        // Primary: last section whose top has crossed the reading line
        let current = sections[0]?.id ?? "";
        for (const s of sections) {
          const el = document.getElementById(s.id);
          if (!el) continue;
          if (el.getBoundingClientRect().top - margin <= 8) current = s.id;
        }
        // Bottom of page → pin last section (Sources)
        const doc = document.documentElement;
        if (window.innerHeight + window.scrollY >= doc.scrollHeight - 120) {
          current = sections[sections.length - 1]?.id ?? current;
        }
        setActiveId((prev) => (prev === current ? prev : current));
      },
      {
        root: null,
        rootMargin: `-${scrollMarginPx()}px 0px -40% 0px`,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [active, sections]);

  // Publish sticky CSS vars for comparison headers / scroll-margin
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--fs-chrome-offset", FS_CHROME_OFFSET);
    root.style.setProperty("--fs-compare-header-h", FS_COMPARE_HEADER_H);
    // When analysis is active, scroll targets clear the glass chrome (+ compare when in stats)
    root.style.setProperty(
      "--fs-scroll-margin",
      active ? "calc(var(--fs-chrome-offset) + 0.75rem)" : "5.5rem",
    );
    root.dataset.fsAnalysisNav = active ? (docked ? "docked" : "inline") : "off";
    return () => {
      delete root.dataset.fsAnalysisNav;
    };
  }, [active, docked]);

  const value = useMemo(
    () => ({
      sections,
      activeId,
      docked,
      active,
      goTo,
      registerSentinel,
      setActiveSession,
    }),
    [sections, activeId, docked, active, goTo, registerSentinel, setActiveSession],
  );

  return (
    <AnalysisNavContext.Provider value={value}>{children}</AnalysisNavContext.Provider>
  );
}

export function useAnalysisNav() {
  const ctx = useContext(AnalysisNavContext);
  if (!ctx) {
    return {
      sections: ANALYSIS_NAV_SECTIONS,
      activeId: "",
      docked: false,
      active: false,
      goTo: () => {},
      registerSentinel: () => {},
      setActiveSession: () => {},
    } satisfies AnalysisNavContextValue;
  }
  return ctx;
}
