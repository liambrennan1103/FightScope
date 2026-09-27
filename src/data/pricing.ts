import type { PricingTier } from "@/lib/types";

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "€0",
    cadence: "forever",
    description: "Browse cards, fighters, and matchups. Analysis unlocks with Starter.",
    features: [
      "Browse upcoming fights and events",
      "Fighter profiles and records",
      "Search and Compare selection",
      "No AI fight analysis",
    ],
    cta: "Continue with Free",
  },
  {
    id: "starter",
    name: "Starter",
    priceLabel: "€4.99",
    cadence: "month",
    description: "Essential FightScope AI — who is favored and why.",
    features: [
      "Analyze Fight with AI",
      "Win probabilities",
      "Predicted edge",
      "Key Matchup Factors",
      "Short matchup interpretation",
    ],
    cta: "Upgrade to Starter",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "€9.99",
    cadence: "month",
    description: "Full FightScope depth — ratings, scenarios, and deep analysis.",
    features: [
      "Everything in Starter",
      "FightScope Rating",
      "Deep Analysis",
      "Fight scenarios and path to victory",
      "Advanced statistical analysis",
      "Unlimited comparisons",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
];

export const PREMIUM_COPY = {
  fullAnalysis: {
    title: "Unlock Pro analysis",
    body: "Deep Analysis, FightScope Rating, scenarios, and advanced stats.",
  },
  advancedStats: {
    title: "Unlock Pro analysis",
    body: "Deep Analysis, FightScope Rating, scenarios, and advanced stats.",
  },
  compareAnalysis: {
    title: "Unlock Pro analysis",
    body: "Deep Analysis, FightScope Rating, scenarios, and advanced stats.",
  },
  starterRequired: {
    title: "Analyze Fight is a Starter feature",
    body: "Unlock win probabilities, predicted edge, and Key Matchup Factors.",
  },
} as const;
