export type LandingLocale = "en" | "fr";

export const LANDING_LOCALE_KEY = "fightscope-locale";

export interface LandingCopy {
  hero: {
    title1: string;
    title2: string;
    title3: string;
    subtitle1: string;
    subtitle2: string;
    searchPlaceholder: string;
    accuracy: string;
  };
  fighters: {
    line1: string;
    line2: string;
    tagline: string;
  };
  matchup: {
    title: string;
    desc1: string;
    desc2: string;
    pctLeft: string;
    pctMid: string;
    pctRight: string;
    labelLeft: string;
    labelMid: string;
    labelRight: string;
  };
  analysis: {
    line1: string;
    line2: string;
    line3: string;
    body1: string;
    body2: string;
    body3: string;
    body4: string;
  };
  sources: {
    line1: string;
    line2: string;
    desc1: string;
    desc2: string;
  };
  faq: {
    heading: string;
    items: Array<{ q: string; a: string }>;
  };
  login: string;
  lang: { en: string; fr: string };
}

export const LANDING_COPY: Record<LandingLocale, LandingCopy> = {
  en: {
    hero: {
      title1: "PREDICT EVERY",
      title2: "FIGHT BEFORE IT",
      title3: "STARTS.",
      subtitle1: "AI analysis, advanced statistics, and fight scenarios to anticipate outcomes",
      subtitle2: "and better understand the game.",
      searchPlaceholder: "Search for a fighter (e.g. Nurmagomedov, Yadong…)",
      accuracy: "92.2% accuracy on 324 fights analysed last week",
    },
    fighters: {
      line1: "MORE THAN 500 FIGHTERS ",
      line2: "COVERED",
      tagline: "Profiles, styles, recent form and matchup data — all in one place.",
    },
    matchup: {
      title: "O\u2019Malley VS Oliveira",
      desc1: "Millions of MMA data analyzed from over 220 sources to ",
      desc2: "predict each match.",
      pctLeft: "22,7%",
      pctMid: " 0.5%",
      pctRight: " 76.8%",
      labelLeft: "Victory O\u2019Malley",
      labelMid: "Draw",
      labelRight: "Victory Oliveira",
    },
    analysis: {
      line1: "AI ANALSYS TO ",
      line2: "ANTICIPATE EACH ",
      line3: "FIGHT.",
      body1: "Probabilities, scenarios, and key",
      body2: "data to understand the course ",
      body3: "of a fight even before they",
      body4: "touch glove.",
    },
    sources: {
      line1: "METHODOLOGY &",
      line2: "DATA SOURCES",
      desc1: "500+ fighters tracked — profiles, styles and recent form from over 220 sources,",
      desc2: " refreshed about every 30 minutes.",
    },
    faq: {
      heading: "FREQUENTLY QUESTIONS",
      items: [
        {
          q: "1. Is FightScope Free?",
          a: "FightScope offers a free tier with upcoming fight predictions and essential fighter context. Pro unlocks full analyses and unlimited comparisons.",
        },
        {
          q: "2. How do AI analyses work?",
          a: "Each matchup combines fighter attributes, physical profiles, recent performances and style context into a FightScope win probability and method distribution.",
        },
        {
          q: "3. Does FightScope allow betting?",
          a: "No. FightScope does not place, accept or broker bets. It is a fight-analysis product only.",
        },
        {
          q: "4. Is the data reliable?",
          a: "FightScope syncs UFC event and fighter data on a regular refresh cycle. Predictions are analytical estimates, not guarantees.",
        },
      ],
    },
    login: "Login",
    lang: { en: "English", fr: "Français" },
  },
  fr: {
    hero: {
      title1: "PRÉDISEZ CHAQUE",
      title2: "COMBAT AVANT QU\u2019IL",
      title3: "NE COMMENCE.",
      subtitle1: "Analyse IA, statistiques avancées et scénarios de combat pour anticiper les résultats",
      subtitle2: "et mieux comprendre le jeu.",
      searchPlaceholder: "Rechercher un combattant (ex. Nurmagomedov, Yadong…)",
      accuracy: "92,2 % de précision sur 324 combats analysés la semaine dernière",
    },
    fighters: {
      line1: "PLUS DE 500 COMBATTANTS ",
      line2: "COUVERTS",
      tagline: "Profils, styles, forme récente et données de matchup — tout au même endroit.",
    },
    matchup: {
      title: "O\u2019Malley VS Oliveira",
      desc1: "Des millions de données MMA analysées à partir de plus de 220 sources pour ",
      desc2: "prédire chaque match.",
      pctLeft: "22,7%",
      pctMid: " 0,5%",
      pctRight: " 76,8%",
      labelLeft: "Victoire O\u2019Malley",
      labelMid: "Match nul",
      labelRight: "Victoire Oliveira",
    },
    analysis: {
      line1: "ANALYSE IA POUR ",
      line2: "ANTICIPER CHAQUE ",
      line3: "COMBAT.",
      body1: "Probabilités, scénarios et données clés",
      body2: "pour comprendre le déroulement ",
      body3: "d\u2019un combat avant même qu\u2019ils",
      body4: "ne se touchent les gants.",
    },
    sources: {
      line1: "MÉTHODOLOGIE ET",
      line2: "SOURCES DE DONNÉES",
      desc1: "Plus de 500 combattants suivis — profils, styles et forme récente à partir de plus de 220 sources,",
      desc2: " actualisées environ toutes les 30 minutes.",
    },
    faq: {
      heading: "QUESTIONS FRÉQUENTES",
      items: [
        {
          q: "1. FightScope est-il gratuit ?",
          a: "FightScope propose un plan gratuit avec des prédictions sur les combats à venir et le contexte essentiel des combattants. Pro débloque les analyses complètes et les comparaisons illimitées.",
        },
        {
          q: "2. Comment fonctionnent les analyses IA ?",
          a: "Chaque matchup combine attributs des combattants, profils physiques, performances récentes et contexte de style en une probabilité de victoire FightScope et une distribution des méthodes.",
        },
        {
          q: "3. FightScope permet-il de parier ?",
          a: "Non. FightScope ne place, n\u2019accepte ni ne courtise des paris. C\u2019est un produit d\u2019analyse de combat uniquement.",
        },
        {
          q: "4. Les données sont-elles fiables ?",
          a: "FightScope synchronise les données UFC sur un cycle de rafraîchissement régulier. Les prédictions sont des estimations analytiques, pas des garanties.",
        },
      ],
    },
    login: "Connexion",
    lang: { en: "English", fr: "Français" },
  },
};
