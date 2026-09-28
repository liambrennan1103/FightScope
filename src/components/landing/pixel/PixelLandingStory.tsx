"use client";

import Link from "next/link";
import { usePixelLocale } from "@/components/landing/pixel/PixelLocaleContext";
import { PixelScrollDepth } from "@/components/landing/pixel/PixelScrollDepth";
import { PIXEL_ASSETS, PIXEL_COLORS } from "@/components/landing/pixel/layout-spec";
import { PRICING_TIERS } from "@/data/pricing";
import { routes } from "@/lib/routes";
import type { PricingTier } from "@/lib/types";

function asset(path: string): string {
  return `${PIXEL_ASSETS}/${path}`;
}

function formatPlanPrice(tier: PricingTier, locale: "en" | "fr"): string {
  if (!tier.cadence || tier.cadence === "forever") return tier.priceLabel;
  if (tier.cadence === "month") {
    return locale === "fr" ? `${tier.priceLabel}/mois` : `${tier.priceLabel}/mo`;
  }
  return `${tier.priceLabel}/${tier.cadence}`;
}

/**
 * Shared long-form story chapters — same content on mobile + desktop,
 * different compositions via CSS (`.pixel-story` / modifiers).
 */
export function PixelLandingStory() {
  const { copy, locale } = usePixelLocale();

  return (
    <div className="pixel-story" data-locale={locale}>
      {/* AI Analysis — cinematic BG with scroll depth */}
      <PixelScrollDepth
        className="pixel-story-section pixel-story-section--analysis pixel-story-section--cinematic"
        bgSpeed={0.36}
        fgSpeed={-0.08}
      >
        <div className="pixel-story-bg" aria-hidden="true">
          <img
            src={asset("analysis_fight_bg.png")}
            alt=""
            className="pixel-story-bg-img"
            data-scroll-depth="bg"
            data-depth-scale="1.14"
            loading="lazy"
            draggable={false}
          />
          <div className="pixel-story-bg-haze" />
          <div className="pixel-story-bg-overlay" />
          <div className="pixel-story-bg-floor" />
        </div>
        <div className="pixel-story-inner pixel-story-inner--cinematic" data-scroll-depth="fg">
          <p className="pixel-story-eyebrow">{copy.analysis.eyebrow}</p>
          <h2 className="pixel-story-heading pixel-story-heading--accent">
            {copy.analysis.line1} {copy.analysis.line2} {copy.analysis.line3}
          </h2>
          <p className="pixel-story-body">
            {copy.analysis.body1} {copy.analysis.body2.trim()} {copy.analysis.body3} {copy.analysis.body4}
          </p>
        </div>
      </PixelScrollDepth>

      {/* How it works — timeline */}
      <section className="pixel-story-section pixel-story-section--how pixel-story-section--deep">
        <div className="pixel-story-atmosphere" aria-hidden="true" />
        <div className="pixel-story-inner">
          <p className="pixel-story-eyebrow">{copy.howItWorks.eyebrow}</p>
          <h2 className="pixel-story-heading">{copy.howItWorks.heading}</h2>
          <p className="pixel-story-body">{copy.howItWorks.intro}</p>

          <ol className="pixel-story-timeline">
            {copy.howItWorks.steps.map((step, index) => (
              <li key={step.num} className="pixel-story-timeline-step">
                <div className="pixel-story-timeline-rail" aria-hidden="true">
                  <span className="pixel-story-timeline-node" style={{ borderColor: PIXEL_COLORS.accent }} />
                  {index < copy.howItWorks.steps.length - 1 ? (
                    <span className="pixel-story-timeline-line" />
                  ) : null}
                </div>
                <div className="pixel-story-timeline-copy">
                  <p className="pixel-story-timeline-num" style={{ color: PIXEL_COLORS.accent }}>
                    {step.num}
                  </p>
                  <h3 className="pixel-story-timeline-title">{step.title}</h3>
                  <p className="pixel-story-timeline-body">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Methodology */}
      <PixelScrollDepth
        className="pixel-story-section pixel-story-section--sources pixel-story-section--cinematic"
        bgSpeed={0.34}
        fgSpeed={-0.07}
      >
        <div className="pixel-story-bg" aria-hidden="true">
          <img
            src={asset("sources_octagon_bg.png")}
            alt=""
            className="pixel-story-bg-img"
            data-scroll-depth="bg"
            data-depth-scale="1.14"
            loading="lazy"
            draggable={false}
          />
          <div className="pixel-story-bg-haze" />
          <div className="pixel-story-bg-overlay pixel-story-bg-overlay--strong" />
          <div className="pixel-story-bg-floor" />
        </div>
        <div className="pixel-story-inner pixel-story-inner--cinematic" data-scroll-depth="fg">
          <p className="pixel-story-eyebrow">{copy.sources.eyebrow}</p>
          <h2 className="pixel-story-heading pixel-story-heading--accent">
            {copy.sources.line1} {copy.sources.line2}
          </h2>
          <p className="pixel-story-body">
            {copy.sources.desc1.trim()} {copy.sources.desc2.trim()}
          </p>
        </div>
      </PixelScrollDepth>

      {/* Plans teaser — from PRICING_TIERS SoT */}
      <section className="pixel-story-section pixel-story-section--plans pixel-story-section--deep">
        <div className="pixel-story-atmosphere pixel-story-atmosphere--steel" aria-hidden="true" />
        <div className="pixel-story-inner">
          <p className="pixel-story-eyebrow">{copy.plans.eyebrow}</p>
          <h2 className="pixel-story-heading">{copy.plans.heading}</h2>
          <p className="pixel-story-body">{copy.plans.intro}</p>

          <div className="pixel-story-plans" role="list">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`pixel-story-plan${tier.highlighted ? " is-highlight" : ""}`}
                role="listitem"
              >
                <div className="pixel-story-plan-main">
                  <h3 className="pixel-story-plan-name">{tier.name}</h3>
                  <p className="pixel-story-plan-price">{formatPlanPrice(tier, locale)}</p>
                </div>
                <p className="pixel-story-plan-blurb">
                  {copy.plans.blurbs[tier.id as "free" | "starter" | "pro"]}
                </p>
              </div>
            ))}
          </div>

          <Link href={routes.pricing} className="pixel-story-plans-cta">
            {copy.plans.cta}
          </Link>
        </div>
      </section>
    </div>
  );
}
