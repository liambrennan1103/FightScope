"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LANDING_COPY,
  LANDING_LOCALE_KEY,
  type LandingCopy,
  type LandingLocale,
} from "@/lib/landing-i18n";

interface PixelLocaleContextValue {
  locale: LandingLocale;
  copy: LandingCopy;
  setLocale: (locale: LandingLocale) => void;
}

const PixelLocaleContext = createContext<PixelLocaleContextValue | null>(null);

export function PixelLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LandingLocale>("fr");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("locale");
    if (fromQuery === "en" || fromQuery === "fr") {
      setLocaleState(fromQuery);
      localStorage.setItem(LANDING_LOCALE_KEY, fromQuery);
      document.documentElement.lang = fromQuery;
      return;
    }
    const stored = localStorage.getItem(LANDING_LOCALE_KEY);
    if (stored === "en" || stored === "fr") {
      setLocaleState(stored);
      document.documentElement.lang = stored;
    } else {
      document.documentElement.lang = "fr";
    }
  }, []);

  const setLocale = useCallback((next: LandingLocale) => {
    setLocaleState(next);
    localStorage.setItem(LANDING_LOCALE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(
    () => ({
      locale,
      copy: LANDING_COPY[locale],
      setLocale,
    }),
    [locale, setLocale],
  );

  return <PixelLocaleContext.Provider value={value}>{children}</PixelLocaleContext.Provider>;
}

export function usePixelLocale() {
  const ctx = useContext(PixelLocaleContext);
  if (!ctx) throw new Error("usePixelLocale must be used within PixelLocaleProvider");
  return ctx;
}
