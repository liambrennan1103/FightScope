"use client";

import { useMemo, useState } from "react";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { SearchInput } from "@/components/ui/SearchInput";
import { cn } from "@/lib/cn";
import { formatRecord } from "@/lib/format";
import type { Fighter } from "@/lib/types";

interface FighterSelectorProps {
  label: string;
  value: string | null;
  fighters: Fighter[];
  excludeId?: string | null;
  onChange: (slug: string | null) => void;
  align?: "left" | "right";
}

export function FighterSelector({
  label,
  value,
  fighters,
  excludeId,
  onChange,
  align = "left",
}: FighterSelectorProps) {
  const [query, setQuery] = useState("");
  const selected = fighters.find((fighter) => fighter.slug === value) ?? null;

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return fighters
      .filter((fighter) => fighter.id !== excludeId)
      .filter((fighter) =>
        `${fighter.name} ${fighter.nickname ?? ""} ${fighter.division ?? ""}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 8);
  }, [excludeId, fighters, query]);

  return (
    <div className="min-w-0 rounded-xl border border-white/[0.08] bg-surface p-4 sm:p-5">
      <p className="mb-4 text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">{label}</p>
      {selected ? (
        <div
          className={cn(
            "flex items-center gap-3",
            align === "right" && "flex-row-reverse text-right",
          )}
        >
          <FighterPortrait fighter={selected} name={selected.name} variant="medium" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold tracking-tight text-ink">{selected.name}</p>
            {selected.nickname ? (
              <p className="truncate text-[12px] text-mute">“{selected.nickname}”</p>
            ) : null}
            <p className="mt-0.5 text-sm text-mute">
              {formatRecord(selected.record)}
              {selected.division ? ` · ${selected.division}` : ""}
            </p>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setQuery("");
              }}
              className="mt-2 text-[12px] text-mute transition-colors duration-200 hover:text-ink"
            >
              Change fighter
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className={cn("mb-3 text-sm text-mute", align === "right" && "text-right")}>
            Search a name or nickname.
          </p>
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search fighter"
            aria-label={`Search ${label}`}
          />
          {query.trim().length >= 2 ? (
            <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-white/[0.06] bg-elevated/40">
              {options.length === 0 ? (
                <li className="px-3 py-3 text-sm text-mute">No matching fighters.</li>
              ) : (
                options.map((fighter) => (
                  <li key={fighter.id} className="border-b border-white/[0.04] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        onChange(fighter.slug);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-200 hover:bg-white/[0.04]"
                    >
                      <FighterPortrait fighter={fighter} name={fighter.name} variant="avatar" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">{fighter.name}</span>
                        {fighter.nickname ? (
                          <span className="block truncate text-[11px] text-mute">“{fighter.nickname}”</span>
                        ) : null}
                        <span className="block text-[11px] text-mute">
                          {formatRecord(fighter.record)}
                          {fighter.division ? ` · ${fighter.division}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
