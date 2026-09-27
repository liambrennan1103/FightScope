"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { SearchInput } from "@/components/ui/SearchInput";
import { formatRecord } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { SearchFighter } from "@/lib/types";

export function LandingHeroSearch({ fighters }: { fighters: SearchFighter[] }) {
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return fighters
      .filter((fighter) =>
        `${fighter.name} ${fighter.nickname ?? ""} ${fighter.division ?? ""}`.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [fighters, query]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-xl border border-white/[0.1] bg-surface/90 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-4">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
          Search a fighter
        </p>
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nurmagomedov, Yadong, Topuria…"
          aria-label="Search a fighter"
        />
        {query.trim().length >= 2 ? (
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-white/[0.06] bg-elevated/50">
            {options.length === 0 ? (
              <li className="px-3 py-3 text-sm text-mute">No matching fighters.</li>
            ) : (
              options.map((fighter) => (
                <li key={fighter.id} className="border-b border-white/[0.04] last:border-b-0">
                  <Link
                    href={routes.signUp}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-white/[0.04]"
                  >
                    <FighterPortrait
                      fighter={fighter}
                      name={fighter.name}
                      portrait={fighter.portrait}
                      variant="avatar"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{fighter.name}</span>
                      <span className="block text-[11px] text-mute">
                        {formatRecord(fighter.record)}
                        {fighter.division ? ` · ${fighter.division}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
