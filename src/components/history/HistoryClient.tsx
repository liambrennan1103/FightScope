"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  isPreFightHistory,
  listHistory,
  removeHistoryItem,
  type AnalysisHistoryItem,
  type AnalysisHistoryPortrait,
} from "@/lib/analysis-history";
import { formatCompactDate, pct } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { FighterPortraitConfig, PortraitStatus } from "@/lib/types";

function toPortraitConfig(portrait: AnalysisHistoryPortrait): FighterPortraitConfig | null {
  if (!portrait) return null;
  return {
    src: portrait.src,
    objectPosition: portrait.objectPosition ?? "50% 14%",
    status: (portrait.status as PortraitStatus | undefined) ?? "fallback",
  };
}

export function HistoryClient() {
  const [items, setItems] = useState<AnalysisHistoryItem[] | null>(null);

  useEffect(() => {
    setItems(listHistory());
  }, []);

  function handleRemove(id: string) {
    removeHistoryItem(id);
    setItems(listHistory());
  }

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Archive"
        title="Analysis history"
        description="Recent FightScope analyses saved on this device."
        className="mb-0"
      />

      {items === null ? (
        <div className="space-y-3" aria-hidden="true">
          <div className="fs-shimmer h-20 rounded-xl" />
          <div className="fs-shimmer h-20 rounded-xl" />
          <div className="fs-shimmer h-20 rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No analyses yet"
          description="Analyze a fight and it will appear here."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href={routes.app} size="sm">
                Explore fights
              </ButtonLink>
              <ButtonLink href={routes.compare} variant="secondary" size="sm">
                Open Compare
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <HistoryRow key={item.id} item={item} onRemove={handleRemove} />
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({
  item,
  onRemove,
}: {
  item: AnalysisHistoryItem;
  onRemove: (id: string) => void;
}) {
  const winnerIsA = item.predictedWinnerId === item.fighterAId;
  const winnerName = winnerIsA ? item.fighterAName : item.fighterBName;
  const winnerPct = winnerIsA ? item.fighterAWinPct : item.fighterBWinPct;

  return (
    <li>
      <div className="group flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-surface px-4 py-4 transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-white/14 hover:bg-elevated/35 sm:flex-row sm:items-center sm:px-5">
        <Link
          href={routes.historyItem(item.id)}
          className="flex min-w-0 flex-1 items-center gap-4"
        >
          <div className="flex items-center gap-2">
            <FighterPortrait
              name={item.fighterAName}
              portrait={toPortraitConfig(item.fighterAPortrait)}
              fighter={{
                id: item.fighterAId,
                slug: item.fighterASlug,
                name: item.fighterAName,
                portrait: toPortraitConfig(item.fighterAPortrait),
              }}
              variant="thumb"
            />
            <span className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">vs</span>
            <FighterPortrait
              name={item.fighterBName}
              portrait={toPortraitConfig(item.fighterBPortrait)}
              fighter={{
                id: item.fighterBId,
                slug: item.fighterBSlug,
                name: item.fighterBName,
                portrait: toPortraitConfig(item.fighterBPortrait),
              }}
              variant="thumb"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {item.fighterAName}{" "}
              <span className="text-mute">vs</span> {item.fighterBName}
            </p>
            <p className="mt-1 text-xs text-mute">
              {formatCompactDate(item.createdAt)}
              {item.eventName ? ` · ${item.eventName}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
              <Badge tone={isPreFightHistory(item) ? "accent" : "mute"}>
                {isPreFightHistory(item) ? "Pre-fight" : "Retrospective"}
              </Badge>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Badge tone={isPreFightHistory(item) ? "accent" : "mute"}>
              {isPreFightHistory(item) ? "Pre-fight" : "Retrospective"}
            </Badge>
            <Badge tone="accent">Pick {winnerName.split(" ").slice(-1)[0]}</Badge>
            <span className="tabular text-sm font-semibold text-ink">{pct(winnerPct)}</span>
            <span className="text-xs text-mute">
              {pct(item.fighterAWinPct)} / {pct(item.fighterBWinPct)}
            </span>
          </div>
        </Link>

        <div className="flex items-center justify-between gap-3 sm:hidden">
          <div className="flex items-center gap-2">
            <Badge tone="accent">Pick {winnerName.split(" ").slice(-1)[0]}</Badge>
            <span className="tabular text-sm font-semibold text-ink">{pct(winnerPct)}</span>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="text-xs text-mute transition-colors hover:text-ink"
          >
            Remove
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="hidden text-xs text-mute transition-colors hover:text-ink sm:block"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
