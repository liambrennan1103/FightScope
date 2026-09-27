import Link from "next/link";
import { notFound } from "next/navigation";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { FightCard } from "@/components/fight/FightCard";
import { RecentFightList } from "@/components/fight/RecentFightRow";
import { StatGrid } from "@/components/fight/StatComparison";
import { PremiumLock } from "@/components/premium/PremiumLock";
import { ATTRIBUTE_KEYS } from "@/data/constants";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getCatalog, getFightsForFighter } from "@/server/mma/store";
import { cn } from "@/lib/cn";
import { compareHref } from "@/lib/routes";
import {
  displayValue,
  flagEmoji,
  formatHeight,
  formatReach,
  formatRecord,
  rankingLabel,
} from "@/lib/format";

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ fighter: string }>;
}) {
  const { fighter: slug } = await params;
  const catalog = await getCatalog();
  const fighter = catalog.fighters.find((item) => item.slug === slug);
  return { title: fighter?.name ?? "Fighter" };
}

export default async function FighterPage({
  params,
}: {
  params: Promise<{ fighter: string }>;
}) {
  const { fighter: slug } = await params;
  const catalog = await getCatalog();
  const fighter = catalog.fighters.find((item) => item.slug === slug);
  if (!fighter) notFound();

  const upcoming = getFightsForFighter(catalog, fighter.id).filter(
    (view) => view.fight.status === "upcoming",
  );
  const rank = rankingLabel(fighter.ranking);

  return (
    <div className="space-y-12">
      <header className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
        <FighterPortrait fighter={fighter} name={fighter.name} portrait={fighter.portrait} variant="hero" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
            {fighter.division ?? "Fighter"}
          </p>
          {fighter.nickname ? <p className="mt-1 text-sm text-mute">“{fighter.nickname}”</p> : null}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{fighter.name}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {rank ? (
              <Badge tone={fighter.ranking === "C" ? "accent" : "neutral"}>{rank}</Badge>
            ) : null}
            {fighter.country ? (
              <p className="text-sm text-mute">
                {flagEmoji(fighter.countryCode)} {fighter.country}
              </p>
            ) : null}
          </div>
          <p className="mt-3 text-2xl font-semibold tabular text-ink">{formatRecord(fighter.record)}</p>
          <div className="mt-4">
            <ButtonLink href={compareHref(fighter.slug)} variant="secondary" size="sm">
              Compare this fighter
            </ButtonLink>
          </div>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Fact label="Age" value={displayValue(fighter.age)} />
        <Fact label="Height" value={formatHeight(fighter.heightCm)} />
        <Fact label="Reach" value={formatReach(fighter.reachCm)} />
        <Fact label="Stance" value={displayValue(fighter.stance)} />
      </dl>

      <section>
        <SectionHeader title="FightScope attributes" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ATTRIBUTE_KEYS.slice(0, 8).map((item) => {
            const value = fighter.attributes[item.key] ?? 0;
            return (
              <div key={item.key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold tracking-[0.12em] text-mute uppercase">{item.label}</span>
                  <span className="tabular font-semibold text-ink">{value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                  <div
                    className={cn("h-full rounded-full", value >= 85 ? "bg-accent" : "bg-line-strong")}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {upcoming.length > 0 ? (
        <section>
          <SectionHeader title="Scheduled" />
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map((view) => (
              <FightCard key={view.fight.id} view={view} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Recent fights" />
        <RecentFightList fights={fighter.recentFights} />
      </section>

      <section>
        <SectionHeader title="Career finishes" />
        {fighter.finishes.koTko == null && fighter.finishes.submissions == null ? (
          <EmptyState title="Data unavailable" />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-mute">KO/TKO</p>
              <p className="tabular mt-1 text-2xl font-semibold">{displayValue(fighter.finishes.koTko)}</p>
            </div>
            <div>
              <p className="text-[11px] text-mute">Submission</p>
              <p className="tabular mt-1 text-2xl font-semibold">{displayValue(fighter.finishes.submissions)}</p>
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Statistics" pro />
        <PremiumLock feature="advancedStats">
          <StatGrid fighter={fighter} />
        </PremiumLock>
      </section>

      <p className="text-center text-sm text-mute">
        <Link href={compareHref(fighter.slug)} className="text-ink hover:text-accent">
          Open a face-off with {fighter.lastName}
        </Link>
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-mute">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
