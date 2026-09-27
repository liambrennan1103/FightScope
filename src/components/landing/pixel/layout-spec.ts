export const PIXEL_VIEWPORT = { width: 1366, height: 6105 } as const;

export const PIXEL_COLORS = {
  background: "#16181E",
  accent: "#E8765D",
  white: "#FFFFFF",
  muted: "#D9D9D9",
  languagePill: "#6B6C72",
  searchGradientStart: "#C73636",
  searchGradientEnd: "#E8765D",
} as const;

export const PIXEL_SECTIONS = [
  { name: "hero", y: 0, height: 912 },
  { name: "fighters", y: 912, height: 934 },
  { name: "matchup", y: 1846, height: 768 },
  { name: "analysis", y: 2614, height: 1181 },
  { name: "sources", y: 3795, height: 932 },
  { name: "faq", y: 4727, height: 958 },
] as const;

/** Desktop canvas height including footer band after FAQ. */
export const PIXEL_CANVAS_HEIGHT = 6105;

export const PIXEL_ASSETS = "/landing-reference";

export function localY(sectionTop: number, globalY: number): number {
  return globalY - sectionTop;
}
