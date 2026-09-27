"use client";

import { useMemo, useState } from "react";
import { FighterCard } from "@/components/fighter/FighterCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { DIVISIONS } from "@/data/constants";
import { cn } from "@/lib/cn";
import type { Fighter } from "@/lib/types";

export function FightersDirectory({ fighters }: { fighters: Fighter[] }) {
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState("All");
  const [status, setStatus] = useState<"all" | "champion" | "ranked">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fighters.filter((fighter) => {
      const matchesQuery =
        !q ||
        `${fighter.name} ${fighter.nickname ?? ""} ${fighter.country ?? ""} ${fighter.division ?? ""}`
          .toLowerCase()
          .includes(q);
      const matchesDivision = division === "All" || fighter.division === division;
      const matchesStatus =
        status === "all" ||
        (status === "champion" && fighter.ranking === "C") ||
        (status === "ranked" && fighter.ranking !== null);
      return matchesQuery && matchesDivision && matchesStatus;
    });
  }, [division, fighters, query, status]);

  return (
    <div>
      <PageHeader
        kicker="Roster"
        title="Fighters"
        description="Browse the FightScope catalog by name, division, or ranking."
      />
      <div className="mb-6 rounded-xl border border-white/[0.06] bg-surface p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-center">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, nickname, country"
            aria-label="Search fighters"
          />
          <label className="block">
            <span className="sr-only">Division</span>
            <select
              value={division}
              onChange={(event) => setDivision(event.target.value)}
              className="h-10 w-full rounded-lg border border-white/10 bg-elevated px-3 text-sm text-ink"
            >
              <option value="All">All divisions</option>
              {DIVISIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 rounded-lg border border-white/10 p-1">
            {[
              { id: "all", label: "All" },
              { id: "champion", label: "Champions" },
              { id: "ranked", label: "Ranked" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatus(item.id as typeof status)}
                className={cn(
                  "h-8 min-w-0 flex-1 rounded-md px-2 text-[11px] font-medium transition-colors duration-200 sm:px-3 sm:text-xs",
                  status === item.id ? "bg-accent text-white" : "text-mute hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mb-4 text-[12px] text-mute">
        <span className="tabular text-ink">{filtered.length}</span> fighters
      </p>
      {filtered.length === 0 ? (
        <EmptyState
          title="No matching fighters"
          description="Try a different name, division, or ranking filter."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((fighter) => (
            <FighterCard key={fighter.id} fighter={fighter} />
          ))}
        </div>
      )}
    </div>
  );
}
