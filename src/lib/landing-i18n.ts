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
    /** Non-metric trust line — never invent accuracy percentages. */
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
  footer: {
    tagline: string;
    product: string;
    legal: string;
    account: string;
    copyright: string;
    disclaimer: string;
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
      accuracy: "Probabilistic MMA analysis powered by matchup data",
    },
    fighters: {
      line1: "400+ UFC FIGHTERS ",
      line2: "COVERED",
      tagline: "Profiles, styles, recent form and matchup data — all in one place.",
    },
    matchup: {
      title: "O\u2019Malley VS Oliveira",
      desc1: "Structured matchup analysis from FightScope fighter profiles, form and bout context to ",
      desc2: "estimate each fight.",
      pctLeft: "22,7%",
      pctMid: " 0.5%",
      pctRight: " 76.8%",
      labelLeft: "Victory O\u2019Malley",
      labelMid: "Draw",
      labelRight: "Victory Oliveira",
    },
    analysis: {
      line1: "AI ANALYSIS TO ",
      line2: "ANTICIPATE EACH ",
      line3: "FIGHT.",
      body1: "Probabilities, scenarios, and key",
      body2: "data to understand the course ",
      body3: "of a fight even before they",
      body4: "touch gloves.",
    },
    sources: {
      line1: "METHODOLOGY &",
      line2: "DATA SOURCES",
      desc1: "400+ fighters tracked — profiles, styles and recent form from ESPN UFC catalog data,",
      desc2: " refreshed on a regular sync cycle.",
    },
    faq: {
      heading: "FREQUENTLY ASKED QUESTIONS",
      items: [
        {
          q: "1. Is FightScope free?",
          a: "FightScope offers a free tier to browse events and fighters. Starter and Pro unlock deeper analyses. Paid access requires a configured subscription — never unlock via the browser alone.",
        },
        {
          q: "2. How do AI analyses work?",
          a: "Each matchup combines fighter attributes, physical profiles, recent performances and style context into a FightScope win probability and method distribution. Outputs are probabilistic estimates.",
        },
        {
          q: "3. Does FightScope allow betting?",
          a: "No. FightScope does not place, accept or broker bets. It is a fight-analysis product only.",
        },
        {
          q: "4. Is the data reliable?",
          a: "FightScope syncs UFC event and fighter data from its ESPN-backed catalog on a regular refresh cycle. Predictions are analytical estimates, not guarantees of fight outcomes.",
        },
      ],
    },
    footer: {
      tagline:
        "FightScope provides analytical predictions and informational content. Predictions are not guarantees of fight outcomes. Not a betting platform.",
      product: "Product",
      legal: "Legal",
      account: "Account",
      copyright: "All rights reserved.",
      disclaimer: "Not affiliated with UFC. Analysis product only — no betting.",
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
      accuracy: "Analyse MMA probabiliste fondée sur les données de matchup",
    },
    fighters: {
      line1: "PLUS DE 400 COMBATTANTS ",
      line2: "UFC COUVERTS",
      tagline: "Profils, styles, forme récente et données de matchup — tout au même endroit.",
    },
    matchup: {
      title: "O\u2019Malley VS Oliveira",
      desc1: "Analyse structurée à partir des profils FightScope, de la forme et du contexte de combat pour ",
      desc2: "estimer chaque match.",
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
      desc1: "Plus de 400 combattants suivis — profils, styles et forme récente via le catalogue ESPN UFC,",
      desc2: " actualisé sur un cycle de synchronisation régulier.",
    },
    faq: {
      heading: "QUESTIONS FRÉQUENTES",
      items: [
        {
          q: "1. FightScope est-il gratuit ?",
          a: "FightScope propose un plan gratuit pour parcourir événements et combattants. Starter et Pro débloquent des analyses plus profondes. L\u2019accès payant passe par un abonnement configuré — jamais uniquement via le navigateur.",
        },
        {
          q: "2. Comment fonctionnent les analyses IA ?",
          a: "Chaque matchup combine attributs, profils physiques, performances récentes et contexte de style en une probabilité de victoire FightScope et une distribution des méthodes. Ce sont des estimations probabilistes.",
        },
        {
          q: "3. FightScope permet-il de parier ?",
          a: "Non. FightScope ne place, n\u2019accepte ni ne courtise des paris. C\u2019est un produit d\u2019analyse de combat uniquement.",
        },
        {
          q: "4. Les données sont-elles fiables ?",
          a: "FightScope synchronise les données UFC via son catalogue ESPN sur un cycle régulier. Les prédictions sont des estimations analytiques, pas des garanties de résultats.",
        },
      ],
    },
    footer: {
      tagline:
        "FightScope fournit des prédictions analytiques et du contenu informatif. Les prédictions ne garantissent pas le résultat d\u2019un combat. Ce n\u2019est pas une plateforme de paris.",
      product: "Produit",
      legal: "Légal",
      account: "Compte",
      copyright: "Tous droits réservés.",
      disclaimer: "Non affilié à l\u2019UFC. Produit d\u2019analyse uniquement — pas de paris.",
    },
    login: "Connexion",
    lang: { en: "English", fr: "Français" },
  },
};
