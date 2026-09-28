"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { PixelFaqMobile } from "@/components/landing/pixel/PixelFaqMobile";
import { PixelFighterCarousel } from "@/components/landing/pixel/PixelFighterCarousel";
import { PixelLanguageSwitcher } from "@/components/landing/pixel/PixelLanguageSwitcher";
import { PixelLandingSearch } from "@/components/landing/pixel/PixelLandingSearch";
import { usePixelLocale } from "@/components/landing/pixel/PixelLocaleContext";
import { PixelLandingFooter } from "@/components/landing/pixel/PixelLandingFooter";
import { PixelLandingStory } from "@/components/landing/pixel/PixelLandingStory";
import { PixelScrollDepth } from "@/components/landing/pixel/PixelScrollDepth";
import { PIXEL_ASSETS, PIXEL_COLORS } from "@/components/landing/pixel/layout-spec";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { routes } from "@/lib/routes";
import type { Fighter, SearchFighter } from "@/lib/types";

function asset(path: string): string {
  return `${PIXEL_ASSETS}/${path}`;
}

/**
 * Mobile long-form landing — content-driven chapters, centered hero,
 * shared story sections with desktop.
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

      <PixelScrollDepth className="pixel-mobile-hero" bgSpeed={0.38} fgSpeed={-0.08}>
        <div className="pixel-mobile-hero-media" aria-hidden="true">
          <img
            src="/images/hero-arena-fightscope.png"
            alt=""
            className="pixel-mobile-hero-img"
            data-scroll-depth="bg"
            data-depth-scale="1.14"
            draggable={false}
            fetchPriority="high"
          />
          <div className="pixel-mobile-hero-haze" />
          <div className="pixel-mobile-hero-vignette" />
          <div className="pixel-mobile-hero-floor" />
        </div>
        <div className="pixel-mobile-hero-copy" data-scroll-depth="fg">
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
        <div className="pixel-mobile-chapter-bleed" aria-hidden="true" />
      </PixelScrollDepth>

      <section className="pixel-mobile-section pixel-mobile-section--fighters">
        <div className="pixel-mobile-section-atmosphere" aria-hidden="true" />
        <p className="pixel-mobile-eyebrow">{copy.fighters.eyebrow}</p>
        <h2 className="pixel-mobile-heading" style={{ color: PIXEL_COLORS.accent }}>
          {copy.fighters.line1}
          <br />
          {copy.fighters.line2}
        </h2>
        <p className="pixel-mobile-tagline">{copy.fighters.tagline}</p>
        <div className="pixel-mobile-carousel">
          <PixelFighterCarousel fighters={carouselFighters} />
        </div>
        <Link href={routes.events} className="pixel-mobile-inline-cta">
          {copy.fighters.cta}
        </Link>
      </section>

      <PixelScrollDepth
        className="pixel-mobile-section pixel-mobile-section--matchup"
        bgSpeed={0.2}
        midSpeed={0.1}
        fgSpeed={-0.06}
      >
        <div className="pixel-mobile-chapter-fade" aria-hidden="true" />
        <div className="pixel-mobile-section-atmosphere pixel-mobile-section-atmosphere--coral" aria-hidden="true" />
        <div data-scroll-depth="fg">
          <p className="pixel-mobile-eyebrow pixel-mobile-eyebrow--center">{copy.matchup.eyebrow}</p>
          <h2 className="pixel-mobile-heading pixel-mobile-heading--center" style={{ color: PIXEL_COLORS.accent }}>
            {copy.matchup.title}
          </h2>
          <p className="pixel-mobile-body pixel-mobile-body--center">
            {copy.matchup.desc1.trim()} {copy.matchup.desc2.trim()}
          </p>
        </div>
        <div data-scroll-depth="mid" className="pixel-mobile-matchup-block">
          <div className="pixel-mobile-matchup-stage">
            <div className="pixel-mobile-matchup-depth" aria-hidden="true" />
            <div className="pixel-mobile-matchup-spot" aria-hidden="true" />
            <img
              src={asset("omalley_cutout.png")}
              alt="Sean O'Malley"
              className="pixel-mobile-cutout pixel-mobile-cutout--left"
              draggable={false}
              loading="lazy"
            />
            <img
              src={asset("oliveira_cutout.png")}
              alt="Charles Oliveira"
              className="pixel-mobile-cutout pixel-mobile-cutout--right"
              draggable={false}
              loading="lazy"
            />
            <div className="pixel-mobile-matchup-stats">
              <div className="pixel-mobile-matchup-stat">
                <p className="pixel-mobile-pct">{copy.matchup.pctLeft}</p>
                <p className="pixel-mobile-pct-label">{copy.matchup.labelLeft}</p>
              </div>
              <div className="pixel-mobile-matchup-stat pixel-mobile-matchup-stat--mid">
                <p className="pixel-mobile-pct">{copy.matchup.pctMid}</p>
                <p className="pixel-mobile-pct-label">{copy.matchup.labelMid}</p>
              </div>
              <div className="pixel-mobile-matchup-stat">
                <p className="pixel-mobile-pct">{copy.matchup.pctRight}</p>
                <p className="pixel-mobile-pct-label">{copy.matchup.labelRight}</p>
              </div>
            </div>
          </div>
          <p className="pixel-mobile-note">{copy.matchup.note}</p>
        </div>
      </PixelScrollDepth>

      <PixelLandingStory />

      <section className="pixel-mobile-section pixel-mobile-section--faq" id="faq">
        <PixelFaqMobile />
      </section>

      <PixelLandingFooter />
    </div>
  );
}
