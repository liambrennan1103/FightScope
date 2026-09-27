"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { PixelLanguageSwitcher } from "@/components/landing/pixel/PixelLanguageSwitcher";
import { PixelLandingSearch } from "@/components/landing/pixel/PixelLandingSearch";
import { usePixelLocale } from "@/components/landing/pixel/PixelLocaleContext";
import { PixelParallaxBackground } from "@/components/landing/pixel/PixelParallaxBackground";
import { PIXEL_SECTIONS } from "@/components/landing/pixel/layout-spec";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { routes } from "@/lib/routes";
import type { SearchFighter } from "@/lib/types";

function LoginArrowIcon() {
  return (
    <svg
      className="pixel-login-icon"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.5 2.75 11.25 8 5.5 13.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * FightScope hero — centered content, clear arena photography, subtle depth.
 */
export function PixelHeroStage({ fighters }: { fighters: SearchFighter[] }) {
  const { copy, locale } = usePixelLocale();
  const stageRef = useRef<HTMLElement | null>(null);
  const midRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const [entered, setEntered] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    setIsTouch(touch);

    if (reducedRef.current) {
      setEntered(true);
      return;
    }

    const enterTimer = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(enterTimer);
  }, []);

  // Subtle mid-layer drift only (halos) — main photo depth is PixelParallaxBackground
  useEffect(() => {
    if (reducedRef.current) return;
    const mid = midRef.current;
    if (!mid) return;

    const apply = () => {
      rafRef.current = 0;
      const y = window.scrollY * 0.18;
      mid.style.transform = `translate3d(0, ${y}px, 0)`;
    };

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, []);

  const titleLines = [copy.hero.title1, copy.hero.title2, copy.hero.title3];

  return (
    <section
      ref={stageRef}
      className={`pixel-section pixel-hero-stage${entered ? " is-entered" : ""}${
        isTouch ? " is-touch" : ""
      }`}
      style={{ top: 0, height: PIXEL_SECTIONS[0].height, zIndex: 1 }}
      data-locale={locale}
    >
      <PixelParallaxBackground
        src="/images/hero-arena-fightscope.png"
        className="pixel-hero-parallax"
        speed={0.22}
        opacity={1}
        objectPosition="center 42%"
        style={{ inset: 0, width: "100%", height: "100%" }}
      />
      <div className="pixel-hero-vignette" aria-hidden="true" />

      <div ref={midRef} className="pixel-hero-layer pixel-hero-layer--mid" aria-hidden="true">
        <div className="pixel-hero-halo pixel-hero-halo--red" />
        <div className="pixel-hero-halo pixel-hero-halo--steel" />
      </div>

      <div className="pixel-hero-layer pixel-hero-layer--fg">
        <Link href={routes.landing} className="pixel-header-logo" aria-label="FightScope home">
          <Logo className="text-white" wordmarkClassName="text-white !text-[22px] !font-semibold" />
        </Link>

        <div className="pixel-header-actions">
          <PixelLanguageSwitcher />
          <Link href={routes.signIn} className="pixel-login-wrap">
            <LoginArrowIcon />
            <span className="pixel-login-text">{copy.login}</span>
          </Link>
        </div>

        <div className="pixel-hero-compose">
          <div className="pixel-hero-copy">
            <h1 className="pixel-hero-title">
              {titleLines.map((line) => (
                <span key={line} className="pixel-hero-title-line">
                  {line}
                </span>
              ))}
            </h1>
            <p className="pixel-hero-subtitle">
              {copy.hero.subtitle1} {copy.hero.subtitle2}
            </p>

            <div className="pixel-hero-cta-row">
              <PixelLandingSearch fighters={fighters} layout="hero" />
              <GlassPanel tone="deep" className="pixel-hero-accuracy-badge">
                <p className="pixel-hero-accuracy-text">{copy.hero.accuracy}</p>
              </GlassPanel>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
