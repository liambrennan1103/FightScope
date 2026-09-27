import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { LandingDeviceFrame, LandingEyebrow } from "@/components/landing/LandingShell";
import { LandingTapeBar } from "@/components/landing/LandingTapeBar";
import { PhysicalComparison } from "@/components/fight/PhysicalComparison";
import { AttributeComparison } from "@/components/fight/AttributeComparison";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { formatRecord, pct } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { FightView } from "@/lib/types";

const DEMO_ATTRS = [
  { key: "striking", label: "Striking" },
  { key: "power", label: "Power" },
  { key: "grappling", label: "Grappling" },
  { key: "wrestling", label: "Wrestling" },
  { key: "cardio", label: "Cardio" },
] as const;

export function LandingAnalysisFeature({ view }: { view: FightView | null }) {
  if (!view) return null;

  const { fighterA, fighterB, prediction, fight, event } = view;
  const predictedA = prediction.predictedWinnerId === fighterA.id;
  const pick = predictedA ? fighterA : fighterB;

  return (
    <section className="relative overflow-hidden border-b border-white/[0.05] bg-background">
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <LandingEyebrow>Matchup analysis</LandingEyebrow>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            Know who holds the edge
            <br />
            before fight night.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-mute sm:text-lg">
            See style clash, physical advantages, recent form and a clear FightScope pick — so you
            walk into the card with a read, not a guess.
          </p>
          <div className="mt-8">
            <ButtonLink href={routes.signUp} size="lg">
              Analyze a fight
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delayMs={80}>
          <LandingDeviceFrame label="fightscope.app/fight">
            <div className="space-y-4">
              <div className="overflow-visible rounded-xl border border-white/[0.08] bg-surface px-4 py-5 sm:px-5 sm:py-6">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
                    Matchup
                  </p>
                  <p className="truncate text-right text-[11px] text-mute">
                    {event.name}
                    {fight.division ? ` · ${fight.division}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
                  <AnalysisFighter fighter={fighterA} predicted={predictedA} />
                  <div className="flex flex-col items-center px-1">
                    <p className="text-[10px] font-semibold tracking-[0.24em] text-mute">VS</p>
                    <div className="mt-2 flex items-end gap-2.5 sm:gap-3">
                      <p
                        className={cn(
                          "font-display tabular-nums text-3xl font-semibold leading-none sm:text-4xl",
                          predictedA ? "text-accent" : "text-mute",
                        )}
                      >
                        {pct(prediction.fighterAWinPct)}
                      </p>
                      <p
                        className={cn(
                          "font-display tabular-nums text-3xl font-semibold leading-none sm:text-4xl",
                          !predictedA ? "text-accent" : "text-mute",
                        )}
                      >
                        {pct(prediction.fighterBWinPct)}
                      </p>
                    </div>
                    <p className="mt-2 text-center text-[11px] text-mute">
                      Pick <span className="font-semibold text-accent">{pick.lastName}</span>
                    </p>
                  </div>
                  <AnalysisFighter fighter={fighterB} predicted={!predictedA} />
                </div>

                <LandingTapeBar
                  className="mt-5"
                  leftPct={prediction.fighterAWinPct}
                  heightClassName="h-2"
                />
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-elevated/40 p-3 sm:p-4">
                <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
                  Physical
                </p>
                <PhysicalComparison fighterA={fighterA} fighterB={fighterB} />
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-elevated/40 p-3 sm:p-4">
                <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
                  FightScope attributes
                </p>
                <AttributeComparison fighterA={fighterA} fighterB={fighterB} keys={DEMO_ATTRS} />
              </div>
            </div>
          </LandingDeviceFrame>
        </Reveal>
      </div>
    </section>
  );
}

function AnalysisFighter({
  fighter,
  predicted,
}: {
  fighter: FightView["fighterA"];
  predicted: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <FighterPortrait
        fighter={fighter}
        name={fighter.name}
        portrait={fighter.portrait}
        variant="medium"
        ring={predicted}
        className="!h-[6.5rem] !w-[5rem] sm:!h-28 sm:!w-[5.5rem]"
      />
      <p className="mt-3 w-full truncate text-sm font-semibold tracking-tight text-ink sm:text-base">
        {fighter.lastName}
      </p>
      <p className="truncate text-[12px] text-mute">{fighter.firstName}</p>
      <p className="mt-0.5 font-mono text-[11px] text-mute">{formatRecord(fighter.record)}</p>
    </div>
  );
}
