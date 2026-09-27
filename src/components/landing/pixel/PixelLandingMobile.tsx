"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { PixelFaqMobile } from "@/components/landing/pixel/PixelFaqMobile";
import { PixelFighterCarousel } from "@/components/landing/pixel/PixelFighterCarousel";
import { PixelLanguageSwitcher } from "@/components/landing/pixel/PixelLanguageSwitcher";
import { PixelLandingSearch } from "@/components/landing/pixel/PixelLandingSearch";
import { usePixelLocale } from "@/components/landing/pixel/PixelLocaleContext";
import { PixelLandingFooter } from "@/components/landing/pixel/PixelLandingFooter";
import { PIXEL_ASSETS, PIXEL_COLORS } from "@/components/landing/pixel/layout-spec";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { routes } from "@/lib/routes";
import type { Fighter, SearchFighter } from "@/lib/types";

function asset(path: string): string {
  return `${PIXEL_ASSETS}/${path}`;
}

/**
 * Mobile-first flow layout for the pixel landing.
 * Preserves arena / event imagery; does not scale the 1366 desktop canvas.
 */
export function PixelLandingMobile({
  fighters,
  carouselFighters,
}: {
  fighters: SearchFighter[];
  carouselFighters: Fighter[];
}) {
  const { copy, locale } = usePixelLocale();
  const titleLines = [copy.hero.title1, copy.hero.title2, copy.hero.title3];

  return (
    <div className="pixel-mobile" data-locale={locale}>
      <header className="pixel-mobile-header">
        <Link href={routes.landing} className="pixel-mobile-logo" aria-label="FightScope home">
          <Logo className="text-white" wordmarkClassName="text-white !text-[18px] !font-semibold" />
        </Link>
        <div className="pixel-mobile-header-actions">
          <PixelLanguageSwitcher />
          <Link href={routes.signIn} className="pixel-mobile-login">
            {copy.login}
          </Link>
        </div>
      </header>

      <section className="pixel-mobile-hero">
        <div className="pixel-mobile-hero-media" aria-hidden="true">
          <img
            src="/images/hero-arena-fightscope.png"
            alt=""
            className="pixel-mobile-hero-img"
            draggable={false}
          />
          <div className="pixel-mobile-hero-vignette" />
        </div>
        <div className="pixel-mobile-hero-copy">
          <h1 className="pixel-mobile-hero-title">
            {titleLines.map((line) => (
              <span key={line} className="pixel-mobile-hero-title-line">
                {line}
              </span>
            ))}
          </h1>
          <p className="pixel-mobile-hero-sub">
            {copy.hero.subtitle1} {copy.hero.subtitle2}
          </p>
          <div className="pixel-mobile-hero-cta">
            <PixelLandingSearch fighters={fighters} layout="hero" />
            <GlassPanel tone="deep" className="pixel-mobile-trust-badge">
              <p>{copy.hero.accuracy}</p>
            </GlassPanel>
          </div>
        </div>
      </section>

      <section className="pixel-mobile-section pixel-mobile-section--fighters">
        <h2 className="pixel-mobile-heading" style={{ color: PIXEL_COLORS.accent }}>
          {copy.fighters.line1.trim()}
          <br />
          {copy.fighters.line2}
        </h2>
        <p className="pixel-mobile-tagline">{copy.fighters.tagline}</p>
        <div className="pixel-mobile-carousel">
          <PixelFighterCarousel fighters={carouselFighters} />
        </div>
      </section>

      <section className="pixel-mobile-section pixel-mobile-section--matchup">
        <h2 className="pixel-mobile-heading pixel-mobile-heading--center" style={{ color: PIXEL_COLORS.accent }}>
          {copy.matchup.title}
        </h2>
        <p className="pixel-mobile-body pixel-mobile-body--center">
          {copy.matchup.desc1.trim()} {copy.matchup.desc2.trim()}
        </p>
        <div className="pixel-mobile-matchup-stage">
          <img
            src={asset("omalley_cutout.png")}
            alt="Sean O'Malley"
            className="pixel-mobile-cutout pixel-mobile-cutout--left"
            draggable={false}
          />
          <img
            src={asset("oliveira_cutout.png")}
            alt="Charles Oliveira"
            className="pixel-mobile-cutout pixel-mobile-cutout--right"
            draggable={false}
          />
          <div className="pixel-mobile-matchup-stats">
            <div>
              <p className="pixel-mobile-pct">{copy.matchup.pctLeft.trim()}</p>
              <p className="pixel-mobile-pct-label">{copy.matchup.labelLeft}</p>
            </div>
            <div>
              <p className="pixel-mobile-pct">{copy.matchup.pctMid.trim()}</p>
              <p className="pixel-mobile-pct-label">{copy.matchup.labelMid}</p>
            </div>
            <div>
              <p className="pixel-mobile-pct">{copy.matchup.pctRight.trim()}</p>
              <p className="pixel-mobile-pct-label">{copy.matchup.labelRight}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pixel-mobile-section pixel-mobile-section--analysis">
        <div className="pixel-mobile-bg-wrap" aria-hidden="true">
          <img src={asset("analysis_fight_bg.png")} alt="" className="pixel-mobile-bg-img" draggable={false} />
          <div className="pixel-mobile-bg-overlay" />
        </div>
        <div className="pixel-mobile-section-inner">
          <h2 className="pixel-mobile-heading" style={{ color: PIXEL_COLORS.accent }}>
            {copy.analysis.line1.trim()}
            <br />
            {copy.analysis.line2.trim()}
            <br />
            {copy.analysis.line3.trim()}
          </h2>
          <p className="pixel-mobile-body">
            {copy.analysis.body1} {copy.analysis.body2.trim()} {copy.analysis.body3} {copy.analysis.body4}
          </p>
        </div>
      </section>

      <section className="pixel-mobile-section pixel-mobile-section--sources">
        <div className="pixel-mobile-bg-wrap" aria-hidden="true">
          <img src={asset("sources_octagon_bg.png")} alt="" className="pixel-mobile-bg-img" draggable={false} />
          <div className="pixel-mobile-bg-overlay pixel-mobile-bg-overlay--strong" />
        </div>
        <div className="pixel-mobile-section-inner pixel-mobile-section-inner--center">
          <h2 className="pixel-mobile-heading pixel-mobile-heading--center" style={{ color: PIXEL_COLORS.accent }}>
            {copy.sources.line1.trim()}
            <br />
            {copy.sources.line2}
          </h2>
          <p className="pixel-mobile-body pixel-mobile-body--center">
            {copy.sources.desc1.trim()}
            {copy.sources.desc2}
          </p>
        </div>
      </section>

      <section className="pixel-mobile-section pixel-mobile-section--faq" id="faq">
        <PixelFaqMobile />
      </section>

      <PixelLandingFooter />
    </div>
  );
}
