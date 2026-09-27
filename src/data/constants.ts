export const ATTRIBUTE_KEYS = [
  { key: "striking", label: "Striking" },
  { key: "power", label: "Power" },
  { key: "grappling", label: "Grappling" },
  { key: "wrestling", label: "Wrestling" },
  { key: "cardio", label: "Cardio" },
  { key: "defense", label: "Defense" },
  { key: "durability", label: "Durability" },
  { key: "experience", label: "Experience" },
  { key: "recentForm", label: "Recent form" },
] as const;

export const STAT_KEYS = [
  {
    key: "sigStrikesLandedPerMin",
    label: "Significant strikes landed/min",
    format: "decimal" as const,
  },
  {
    key: "sigStrikeAccuracy",
    label: "Significant strike accuracy",
    format: "percent" as const,
  },
  {
    key: "sigStrikesAbsorbedPerMin",
    label: "Significant strikes absorbed/min",
    format: "decimal" as const,
  },
  {
    key: "strikingDefense",
    label: "Striking defense",
    format: "percent" as const,
  },
  {
    key: "takedownsPer15",
    label: "Takedowns/15 min",
    format: "decimal" as const,
  },
  {
    key: "takedownAccuracy",
    label: "Takedown accuracy",
    format: "percent" as const,
  },
  {
    key: "takedownDefense",
    label: "Takedown defense",
    format: "percent" as const,
  },
  {
    key: "submissionAttemptsPer15",
    label: "Submission attempts/15 min",
    format: "decimal" as const,
  },
  {
    key: "knockdownsPer15",
    label: "Knockdowns/15 min",
    format: "decimal" as const,
  },
] as const;

export const DIVISIONS = [
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Heavyweight",
  "Women's Strawweight",
  "Women's Flyweight",
  "Women's Bantamweight",
] as const;

export const NAV_ITEMS = [
  { href: "/app", label: "Home" },
  { href: "/app/events", label: "Events" },
  { href: "/app/fighters", label: "Fighters" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/history", label: "History" },
  { href: "/app/pricing", label: "Pricing" },
] as const;
