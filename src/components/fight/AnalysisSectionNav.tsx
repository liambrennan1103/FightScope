"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  ANALYSIS_NAV_SECTIONS,
  useAnalysisNav,
  type AnalysisNavSection,
} from "@/components/fight/AnalysisNavContext";

export { ANALYSIS_NAV_SECTIONS };
export type { AnalysisNavSection };

/**
 * Inline analysis chapter nav. When scrolled past the glass chrome, presentation
 * docks into ProductTopBar via shared AnalysisNavContext (single active state).
 */
export function AnalysisSectionNav({ className }: { className?: string }) {
  const { sections, activeId, docked, goTo, registerSentinel, setActiveSession } =
    useAnalysisNav();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    setActiveSession(true);
    return () => setActiveSession(false);
  }, [setActiveSession]);

  useEffect(() => {
    registerSentinel(rootRef.current);
    return () => registerSentinel(null);
  }, [registerSentinel]);

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      data-fs-analysis-nav-inline=""
    >
      {/* Spacer preserves layout when docked so the page does not jump */}
      <div
        className={cn(
          "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          docked ? "pointer-events-none opacity-0" : "opacity-100",
          !reduced && docked && "-translate-y-1 scale-[0.98]",
        )}
        aria-hidden={docked}
      >
        <AnalysisNavLinks
          sections={sections}
          activeId={activeId}
          goTo={goTo}
          variant="inline"
        />
      </div>
    </div>
  );
}

/** Compact / full links rendered inside ProductTopBar when docked. */
export function DockedAnalysisNav() {
  const { active, docked, sections, activeId, goTo } = useAnalysisNav();
  if (!active || !docked) return null;

  return (
    <div
      className={cn(
        "min-w-0 flex-1 px-1",
        "animate-in fade-in duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
      )}
      data-fs-analysis-nav-docked=""
    >
      <AnalysisNavLinks
        sections={sections}
        activeId={activeId}
        goTo={goTo}
        variant="docked"
      />
    </div>
  );
}

function AnalysisNavLinks({
  sections,
  activeId,
  goTo,
  variant,
}: {
  sections: AnalysisNavSection[];
  activeId: string;
  goTo: (id: string) => void;
  variant: "inline" | "docked";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const active = sections.find((s) => s.id === activeId) ?? sections[0];
  const compact = variant === "docked";

  return (
    <nav
      className={cn(
        variant === "inline" &&
          "border-b border-white/[0.06] bg-transparent py-1 sm:py-1.5",
        variant === "docked" && "w-full",
      )}
      aria-label="Analysis sections"
    >
      {/* Desktop / wide docked: full label row */}
      <div
        className={cn(
          "items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          compact ? "hidden lg:flex" : "flex",
        )}
      >
        {sections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => goTo(section.id)}
              className={cn(
                "relative shrink-0 rounded-full px-3 py-2 text-[11px] font-semibold tracking-[0.07em] uppercase transition-colors duration-200",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                compact && "px-2.5 py-1.5 text-[10px] tracking-[0.06em]",
                isActive ? "text-accent" : "text-mute hover:text-ink",
              )}
              aria-current={isActive ? "true" : undefined}
            >
              {section.label}
              <span
                className={cn(
                  "absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-accent transition-opacity duration-200",
                  isActive ? "opacity-100" : "opacity-0",
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {/* Compact docked: current section dropdown (mobile + tablet) */}
      {compact ? (
        <div className="relative lg:hidden">
          <button
            type="button"
            className={cn(
              "inline-flex min-h-10 min-w-[7.5rem] items-center justify-center gap-2 rounded-full border border-[var(--glass-border)] bg-white/[0.05] px-3.5 text-[12px] font-semibold tracking-[0.08em] text-ink uppercase",
              "transition-colors hover:bg-white/[0.08]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-haspopup="listbox"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {active?.label ?? "Overview"}
            <Chevron open={menuOpen} />
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[45] cursor-default"
                aria-label="Close section menu"
                onClick={() => setMenuOpen(false)}
              />
              <ul
                id={menuId}
                role="listbox"
                className="fs-glass fs-glass-panel absolute top-[calc(100%+0.4rem)] left-1/2 z-[46] w-[min(16rem,70vw)] -translate-x-1/2 overflow-hidden py-1"
              >
                {sections.map((section) => {
                  const isActive = activeId === section.id;
                  return (
                    <li key={section.id} role="option" aria-selected={isActive}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors",
                          isActive
                            ? "bg-[var(--glass-active)] text-accent"
                            : "text-ink hover:bg-white/[0.06]",
                        )}
                        onClick={() => {
                          goTo(section.id);
                          setMenuOpen(false);
                        }}
                      >
                        {section.label}
                        {isActive ? <span aria-hidden="true">✓</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      className={cn(
        "text-accent transition-transform duration-200",
        open && "rotate-180",
      )}
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5 L6 8 L9.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
