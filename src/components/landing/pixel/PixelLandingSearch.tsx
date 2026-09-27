"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { usePixelLocale } from "@/components/landing/pixel/PixelLocaleContext";
import { routes } from "@/lib/routes";
import type { SearchFighter } from "@/lib/types";

export function PixelLandingSearch({
  fighters,
  layout = "classic",
}: {
  fighters: SearchFighter[];
  layout?: "classic" | "hero";
}) {
  const { copy } = usePixelLocale();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return fighters
      .filter((fighter) =>
        `${fighter.name} ${fighter.nickname ?? ""} ${fighter.division ?? ""}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 6);
  }, [fighters, query]);

  const showDropdown = focused && options.length > 0;

  const select = useCallback(
    (fighter: SearchFighter) => {
      setQuery(fighter.name);
      setFocused(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [],
  );

  useEffect(() => {
    setActiveIndex(-1);
  }, [options]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      select(options[activeIndex]);
    } else if (event.key === "Escape") {
      setFocused(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={`pixel-search-block${layout === "hero" ? " pixel-search-block--hero" : ""}`}>
      <div className={`pixel-search-outer${focused ? " pixel-search-outer--focus" : ""}`}>
        <input
          ref={inputRef}
          type="search"
          className="pixel-search-inner"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={copy.hero.searchPlaceholder}
          aria-label={copy.hero.searchPlaceholder}
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
      </div>
      {showDropdown ? (
        <ul className="pixel-search-dropdown pixel-search-dropdown--open" role="listbox">
          {options.map((fighter, index) => (
            <li key={fighter.id} role="option" aria-selected={index === activeIndex}>
              <Link
                href={routes.signUp}
                className={
                  index === activeIndex
                    ? "pixel-search-option pixel-search-option--active"
                    : "pixel-search-option"
                }
                onMouseDown={(event) => event.preventDefault()}
              >
                <FighterPortrait
                  fighter={fighter}
                  name={fighter.name}
                  portrait={fighter.portrait}
                  variant="avatar"
                />
                <span className="pixel-search-option-name">{fighter.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
