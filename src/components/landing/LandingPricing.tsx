import { LandingEyebrow } from "@/components/landing/LandingShell";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { PRICING_TIERS } from "@/data/pricing";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";

const PRO_DIFFERENTIATOR = "Unlimited full fight analyses";

export function LandingPricing() {
  return (
    <section id="pricing" className="border-b border-white/[0.05] bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-[980px] px-4 sm:px-6">
        <Reveal>
          <div className="text-center">
            <LandingEyebrow>Pricing</LandingEyebrow>
            <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              Start free.
              <br />
              Go deeper with Pro.
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid items-stretch gap-4 md:grid-cols-2 md:gap-5">
          {PRICING_TIERS.map((tier, index) => {
            const highlighted = Boolean(tier.highlighted);
            return (
              <Reveal key={tier.id} delayMs={index * 70}>
                <div
                  className={cn(
                    "relative flex h-full flex-col border p-7 sm:p-8",
                    highlighted
                      ? "z-[1] border-accent/50 bg-[linear-gradient(165deg,rgba(199,54,54,0.16),rgba(14,15,18,0.98)_42%)] md:-my-2 md:p-9"
                      : "border-white/[0.07] bg-surface/60",
                  )}
                >
                  {highlighted ? (
                    <p className="mb-4 inline-flex w-fit border border-accent/35 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
                      Recommended
                    </p>
                  ) : (
                    <div className="mb-4 h-7" aria-hidden="true" />
                  )}
                  <p className="text-[12px] tracking-[0.16em] text-mute uppercase">{tier.name}</p>
                  <p className="font-display mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-[2.75rem]">
                    {tier.priceLabel}
                    {tier.cadence ? (
                      <span className="ml-1 text-base font-normal text-mute">/ {tier.cadence}</span>
                    ) : null}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-mute">{tier.description}</p>
                  <ul className="mt-8 flex-1 space-y-3 border-t border-white/[0.06] pt-6">
                    {tier.features.map((feature) => {
                      const isDiff =
                        highlighted &&
                        (feature.toLowerCase().includes("full fight") ||
                          feature.toLowerCase().includes("unlimited"));
                      return (
                        <li
                          key={feature}
                          className={cn(
                            "flex gap-2.5 text-sm",
                            isDiff ? "font-semibold text-ink" : "text-ink/90",
                          )}
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-fill" />
                          {isDiff && feature.toLowerCase().includes("full")
                            ? PRO_DIFFERENTIATOR
                            : feature}
                        </li>
                      );
                    })}
                  </ul>
                  {/* Social “chosen by X%” omitted — no verified plan-mix metric. */}
                  <div className="mt-8">
                    <ButtonLink
                      href={routes.signUp}
                      variant={highlighted ? "primary" : "secondary"}
                      size="lg"
                      className="w-full"
                    >
                      {highlighted ? "Start free" : tier.cta}
                    </ButtonLink>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
