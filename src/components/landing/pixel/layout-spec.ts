export const PIXEL_VIEWPORT = { width: 1366, height: 2614 } as const;

export const PIXEL_COLORS = {
  background: "#16181E",
  accent: "#E8765D",
  white: "#FFFFFF",
  muted: "#D9D9D9",
  languagePill: "#6B6C72",
  searchGradientStart: "#C73636",
  searchGradientEnd: "#E8765D",
} as const;

/** Cinematic canvas: hero → fighters → featured matchup. Story continues in flow. */
export const PIXEL_SECTIONS = [
  { name: "hero", y: 0, height: 912 },
  { name: "fighters", y: 912, height: 934 },
  { name: "matchup", y: 1846, height: 768 },
] as const;

/** Desktop scaled canvas height (hero + fighters + matchup only). */
export const PIXEL_CANVAS_HEIGHT = 2614;

export const PIXEL_ASSETS = "/landing-reference";

export function localY(sectionTop: number, globalY: number): number {
  return globalY - sectionTop;
}
