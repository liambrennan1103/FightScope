"use client";

import { useEffect, useRef, useState } from "react";
import { usePixelLocale } from "@/components/landing/pixel/PixelLocaleContext";
import type { LandingLocale } from "@/lib/landing-i18n";

const OPTIONS: LandingLocale[] = ["en", "fr"];

export function PixelLanguageSwitcher() {
  const { locale, copy, setLocale } = usePixelLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="pixel-lang-switcher">
      <button
        type="button"
        className="pixel-lang-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="pixel-lang-trigger-bg" aria-hidden="true" />
        <span className="pixel-lang-trigger-label">{copy.lang[locale]}</span>
        <span className="pixel-lang-caret" aria-hidden="true" />
      </button>
      <ul
        className={open ? "pixel-lang-menu pixel-lang-menu--open" : "pixel-lang-menu"}
        role="listbox"
        aria-label="Language"
      >
        {OPTIONS.map((option) => (
          <li key={option} role="option" aria-selected={locale === option}>
            <button
              type="button"
              className={
                locale === option ? "pixel-lang-option pixel-lang-option--active" : "pixel-lang-option"
              }
              onClick={() => {
                setLocale(option);
                setOpen(false);
              }}
            >
              {copy.lang[option]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
