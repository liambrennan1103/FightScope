"use client";

import { forwardRef } from "react";
import { PixelFighterCarousel } from "@/components/landing/pixel/PixelFighterCarousel";
import { PixelHeroStage } from "@/components/landing/pixel/PixelHeroStage";
import { PixelLandingFooter } from "@/components/landing/pixel/PixelLandingFooter";
import { PixelLandingMobile } from "@/components/landing/pixel/PixelLandingMobile";
import { PixelFaqMobile } from "@/components/landing/pixel/PixelFaqMobile";
import { PixelLandingStory } from "@/components/landing/pixel/PixelLandingStory";
import { PixelLocaleProvider, usePixelLocale } from "@/components/landing/pixel/PixelLocaleContext";
import { PixelReveal } from "@/components/landing/pixel/PixelReveal";
import {
  PIXEL_ASSETS,
  PIXEL_COLORS,
  PIXEL_SECTIONS,
  localY,
} from "@/components/landing/pixel/layout-spec";
import type { Fighter, SearchFighter } from "@/lib/types";
import "./pixel-landing.css";

function asset(path: string): string {
  return `${PIXEL_ASSETS}/${path}`;
}

const PixelImg = forwardRef<
  HTMLImageElement,
  {
    src: string;
    style: React.CSSProperties;
    alt?: string;
    className?: string;
  }
>(function PixelImg({ src, style, alt = "", className = "" }, ref) {
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={`pixel-abs pixel-img ${className}`.trim()}
      style={style}
      draggable={false}
    />
  );
});

/**
 * Desktop: cinematic scaled canvas for hero → fighters → featured matchup,
 * then shared flow story (capabilities / analysis / how / methodology / plans / FAQ)
 * so desktop and mobile tell the same product narrative.
 */
function PixelLandingDesktop({
  fighters,
  carouselFighters,
}: {
  fighters: SearchFighter[];
  carouselFighters: Fighter[];
}) {
  const { copy, locale } = usePixelLocale();
  const fightersTop = PIXEL_SECTIONS[1].y;
  const matchupTop = PIXEL_SECTIONS[2].y;

  return (
    <div className="pixel-landing-root pixel-landing-root--desktop" data-locale={locale}>
      <div className="pixel-landing-scale">
        <div className="pixel-landing">
          <PixelHeroStage fighters={fighters} />

          <section
            className="pixel-section pixel-section--fighters"
            style={{ top: fightersTop, height: PIXEL_SECTIONS[1].height, zIndex: 2 }}
          >
            <PixelReveal offsetY={12}>
              <div className="pixel-fluid-fighters-stack" style={{ top: localY(fightersTop, 991.1) }}>
                <h2 className="pixel-heading" style={{ color: PIXEL_COLORS.accent }}>
                  {copy.fighters.line1.trim()}
                </h2>
                <h2 className="pixel-heading" style={{ color: PIXEL_COLORS.accent, marginTop: 6 }}>
                  {copy.fighters.line2}
                </h2>
                <p className="pixel-fighters-tagline">{copy.fighters.tagline}</p>
              </div>
            </PixelReveal>
            <div className="pixel-carousel-wrap">
              <PixelFighterCarousel fighters={carouselFighters} />
            </div>
          </section>

          <section
            className="pixel-section pixel-section--matchup"
            style={{ top: matchupTop, height: PIXEL_SECTIONS[2].height, zIndex: 3 }}
          >
            <PixelReveal offsetY={12}>
              <h2
                className="pixel-abs pixel-heading pixel-fluid-centered-title"
                style={{ top: localY(matchupTop, 1927.1), color: PIXEL_COLORS.accent }}
              >
                {copy.matchup.title}
              </h2>
            </PixelReveal>
            <PixelReveal offsetY={10} delayMs={50}>
              <p
                className="pixel-abs pixel-body-bold pixel-fluid-matchup-desc"
                style={{ top: localY(matchupTop, 2008.4), color: PIXEL_COLORS.white }}
              >
                {copy.matchup.desc1.trim()} {copy.matchup.desc2.trim()}
              </p>
            </PixelReveal>

            <PixelImg
              src={asset("omalley_cutout.png")}
              alt="Sean O'Malley"
              className="pixel-fighter-cutout pixel-fighter-cutout--left"
              style={{
                left: 0,
                top: localY(matchupTop, 2011.6),
                width: 396,
                height: 602,
                zIndex: 2,
              }}
            />
            <PixelImg
              src={asset("oliveira_cutout.png")}
              alt="Charles Oliveira"
              className="pixel-fighter-cutout pixel-fighter-cutout--right"
              style={{
                left: 1033.6,
                top: localY(matchupTop, 2011.6),
                width: 403,
                height: 613,
                zIndex: 2,
              }}
            />

            <div className="pixel-matchup-stats" style={{ top: localY(matchupTop, 2188) }}>
              <div className="pixel-matchup-stat">
                <p className="pixel-matchup-pct">{copy.matchup.pctLeft.trim()}</p>
                <p className="pixel-matchup-label">{copy.matchup.labelLeft}</p>
              </div>
              <div className="pixel-matchup-stat">
                <p className="pixel-matchup-pct">{copy.matchup.pctMid.trim()}</p>
                <p className="pixel-matchup-label">{copy.matchup.labelMid}</p>
              </div>
              <div className="pixel-matchup-stat">
                <p className="pixel-matchup-pct">{copy.matchup.pctRight.trim()}</p>
                <p className="pixel-matchup-label">{copy.matchup.labelRight}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="pixel-desktop-flow">
        <PixelLandingStory />
        <section className="pixel-desktop-faq" id="faq">
          <PixelFaqMobile />
        </section>
        <PixelLandingFooter />
      </div>
    </div>
  );
}

export function PixelLanding({
  fighters,
  carouselFighters,
}: {
  fighters: SearchFighter[];
  carouselFighters: Fighter[];
}) {
  return (
    <PixelLocaleProvider>
      <div className="pixel-desktop-only">
        <PixelLandingDesktop fighters={fighters} carouselFighters={carouselFighters} />
      </div>
      <div className="pixel-mobile-only">
        <PixelLandingMobile fighters={fighters} carouselFighters={carouselFighters} />
      </div>
    </PixelLocaleProvider>
  );
}
