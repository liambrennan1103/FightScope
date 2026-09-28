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
    eyebrow: string;
    line1: string;
    line2: string;
    tagline: string;
    cta: string;
  };
  matchup: {
    eyebrow: string;
    title: string;
    desc1: string;
    desc2: string;
    pctLeft: string;
    pctMid: string;
    pctRight: string;
    labelLeft: string;
    labelMid: string;
    labelRight: string;
    note: string;
  };
  capabilities: {
    eyebrow: string;
    heading: string;
    intro: string;
    items: Array<{ title: string; body: string }>;
  };
  analysis: {
    eyebrow: string;
    line1: string;
    line2: string;
    line3: string;
    body1: string;
    body2: string;
    body3: string;
    body4: string;
    cardLabel: string;
    readout: {
      edgeLabel: string;
      edgeValue: string;
      winLabel: string;
      winValue: string;
      methodLabel: string;
      methodValue: string;
      factorsLabel: string;
      factorsValue: string;
      note: string;
    };
  };
  howItWorks: {
    eyebrow: string;
    heading: string;
    intro: string;
    steps: Array<{ num: string; title: string; body: string }>;
  };
  sources: {
    eyebrow: string;
    line1: string;
    line2: string;
    desc1: string;
    desc2: string;
    pillars: Array<{ title: string; body: string }>;
  };
  plans: {
    eyebrow: string;
    heading: string;
    intro: string;
    cta: string;
    /** Localized blurbs keyed by PricingTier.id — prices come from PRICING_TIERS. */
    blurbs: Record<"free" | "starter" | "pro", string>;
  };
  faq: {
    heading: string;
    intro: string;
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
      eyebrow: "Fighter database",
      line1: "400+ UFC FIGHTERS",
      line2: "COVERED",
      tagline: "Profiles, styles, recent form and matchup data — all in one place.",
      cta: "Explore fighters in the app",
    },
    matchup: {
      eyebrow: "Featured prediction",
      title: "O\u2019Malley VS Oliveira",
      desc1: "Structured matchup analysis from FightScope fighter profiles, form and bout context to ",
      desc2: "estimate each fight.",
      pctLeft: "22.7%",
      pctMid: "0.5%",
      pctRight: "76.8%",
      labelLeft: "Victory O\u2019Malley",
      labelMid: "Draw",
      labelRight: "Victory Oliveira",
      note: "Illustrative FightScope win probabilities for this matchup.",
    },
    capabilities: {
      eyebrow: "What FightScope analyzes",
      heading: "THE MODEL LOOKS AT THE FIGHT, NOT JUST THE RECORD.",
      intro: "Every analysis combines the same building blocks you see in the product.",
      items: [
        {
          title: "MATCHUP EDGE",
          body: "Who holds the stylistic advantage — and how wide that edge is.",
        },
        {
          title: "METHOD OF VICTORY",
          body: "KO/TKO · Submission · Decision — how the fight is most likely to end.",
        },
        {
          title: "KEY FACTORS",
          body: "Striking, grappling, physical profile and recent form — the drivers behind the number.",
        },
        {
          title: "SCENARIOS",
          body: "What changes the fight — paths to victory when you go deeper with Pro.",
        },
      ],
    },
    analysis: {
      eyebrow: "AI analysis",
      line1: "AI ANALYSIS TO",
      line2: "ANTICIPATE EACH",
      line3: "FIGHT.",
      body1: "Probabilities, scenarios, and key",
      body2: "data to understand the course ",
      body3: "of a fight even before they",
      body4: "touch gloves.",
      cardLabel: "Matchup intelligence",
      readout: {
        edgeLabel: "Predicted edge",
        edgeValue: "Oliveira",
        winLabel: "Win probability",
        winValue: "76.8%",
        methodLabel: "Method of victory",
        methodValue: "KO/TKO · Submission · Decision",
        factorsLabel: "Key Matchup Factors",
        factorsValue: "Striking · Grappling · Physical · Form",
        note: "Illustrative readout from the featured matchup demo — not a live model call.",
      },
    },
    howItWorks: {
      eyebrow: "How it works",
      heading: "FROM MATCHUP TO STRUCTURED ANALYSIS.",
      intro: "Three steps. No noise.",
      steps: [
        {
          num: "01",
          title: "CHOOSE A FIGHT",
          body: "Pick an upcoming bout or compare two fighters from the UFC catalog.",
        },
        {
          num: "02",
          title: "FIGHTSCOPE CROSSES THE DATA",
          body: "Profiles, styles, physical traits and recent form feed the matchup model.",
        },
        {
          num: "03",
          title: "GET A STRUCTURED ANALYSIS",
          body: "Win probabilities, key factors and — on Pro — scenarios and deep readouts.",
        },
      ],
    },
    sources: {
      eyebrow: "Methodology",
      line1: "METHODOLOGY &",
      line2: "DATA SOURCES",
      desc1: "400+ fighters tracked — profiles, styles and recent form from ESPN UFC catalog data,",
      desc2: " refreshed on a regular sync cycle.",
      pillars: [
        {
          title: "Collection",
          body: "Event cards and fighter profiles synced from the ESPN-backed UFC catalog.",
        },
        {
          title: "Feature engineering",
          body: "Style, physical profile, form and bout context normalized into matchup inputs.",
        },
        {
          title: "Model",
          body: "Probabilistic win and method estimates from structured matchup features.",
        },
        {
          title: "Calibrated output",
          body: "Calibrated probabilities and structured analysis — estimates, never guarantees.",
        },
      ],
    },
    plans: {
      eyebrow: "Plans",
      heading: "START FREE. GO DEEPER WHEN YOU NEED IT.",
      intro: "Same catalog for everyone. Analysis depth scales with your plan.",
      cta: "Explore plans",
      blurbs: {
        free: "Browse events, fighters and matchups — no FightScope predictions.",
        starter: "Win probabilities, predicted edge and Key Matchup Factors.",
        pro: "Deep analysis, FightScope Rating, scenarios and advanced stats.",
      },
    },
    faq: {
      heading: "FREQUENTLY ASKED QUESTIONS",
      intro: "Straight answers on access, how analyses work, and what FightScope is — and is not.",
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
      eyebrow: "Base combattants",
      line1: "PLUS DE 400 COMBATTANTS",
      line2: "UFC COUVERTS",
      tagline: "Profils, styles, forme récente et données de matchup — tout au même endroit.",
      cta: "Explorer les combattants",
    },
    matchup: {
      eyebrow: "Prédiction phare",
      title: "O\u2019Malley VS Oliveira",
      desc1: "Analyse structurée à partir des profils FightScope, de la forme et du contexte de combat pour ",
      desc2: "estimer chaque match.",
      pctLeft: "22,7%",
      pctMid: "0,5%",
      pctRight: "76,8%",
      labelLeft: "Victoire O\u2019Malley",
      labelMid: "Match nul",
      labelRight: "Victoire Oliveira",
      note: "Probabilités FightScope illustratives pour ce matchup.",
    },
    capabilities: {
      eyebrow: "Ce que FightScope analyse",
      heading: "LE MODÈLE LIT LE COMBAT, PAS SEULEMENT LE PALMARÈS.",
      intro: "Chaque analyse s\u2019appuie sur les mêmes briques que dans le produit.",
      items: [
        {
          title: "AVANTAGE DE MATCHUP",
          body: "Qui détient l\u2019avantage stylistique — et de quelle ampleur.",
        },
        {
          title: "MÉTHODE DE VICTOIRE",
          body: "KO/TKO · Soumission · Décision — comment le combat peut se terminer.",
        },
        {
          title: "FACTEURS CLÉS",
          body: "Frappe, grappling, profil physique et forme — les leviers derrière le chiffre.",
        },
        {
          title: "SCÉNARIOS",
          body: "Ce qui change le combat — chemins vers la victoire en profondeur avec Pro.",
        },
      ],
    },
    analysis: {
      eyebrow: "Analyse IA",
      line1: "ANALYSE IA POUR",
      line2: "ANTICIPER CHAQUE",
      line3: "COMBAT.",
      body1: "Probabilités, scénarios et données clés",
      body2: "pour comprendre le déroulement ",
      body3: "d\u2019un combat avant même qu\u2019ils",
      body4: "ne se touchent les gants.",
      cardLabel: "Intelligence de matchup",
      readout: {
        edgeLabel: "Avantage prédit",
        edgeValue: "Oliveira",
        winLabel: "Probabilité de victoire",
        winValue: "76,8%",
        methodLabel: "Méthode de victoire",
        methodValue: "KO/TKO · Soumission · Décision",
        factorsLabel: "Facteurs clés de matchup",
        factorsValue: "Frappe · Grappling · Physique · Forme",
        note: "Lecture illustrative du matchup phare — pas un appel modèle en direct.",
      },
    },
    howItWorks: {
      eyebrow: "Comment ça marche",
      heading: "DU MATCHUP À L\u2019ANALYSE STRUCTURÉE.",
      intro: "Trois étapes. Sans bruit.",
      steps: [
        {
          num: "01",
          title: "CHOISISSEZ UN COMBAT",
          body: "Sélectionnez un affrontement à venir ou comparez deux combattants du catalogue UFC.",
        },
        {
          num: "02",
          title: "FIGHTSCOPE CROISE LES DONNÉES",
          body: "Profils, styles, traits physiques et forme récente alimentent le modèle de matchup.",
        },
        {
          num: "03",
          title: "OBTENEZ UNE ANALYSE STRUCTURÉE",
          body: "Probabilités, facteurs clés et — avec Pro — scénarios et lectures approfondies.",
        },
      ],
    },
    sources: {
      eyebrow: "Méthodologie",
      line1: "MÉTHODOLOGIE ET",
      line2: "SOURCES DE DONNÉES",
      desc1: "Plus de 400 combattants suivis — profils, styles et forme récente via le catalogue ESPN UFC,",
      desc2: " actualisé sur un cycle de synchronisation régulier.",
      pillars: [
        {
          title: "Collecte",
          body: "Cartes d\u2019événements et profils synchronisés via le catalogue UFC ESPN.",
        },
        {
          title: "Feature engineering",
          body: "Style, profil physique, forme et contexte normalisés en entrées de matchup.",
        },
        {
          title: "Modèle",
          body: "Estimations probabilistes de victoire et de méthode à partir des features structurées.",
        },
        {
          title: "Sortie calibrée",
          body: "Probabilités calibrées et analyse structurée — des estimations, jamais des garanties.",
        },
      ],
    },
    plans: {
      eyebrow: "Offres",
      heading: "COMMENCEZ GRATUIT. ALLEZ PLUS LOIN QUAND IL LE FAUT.",
      intro: "Le même catalogue pour tous. La profondeur d\u2019analyse suit votre plan.",
      cta: "Voir les tarifs",
      blurbs: {
        free: "Parcourir événements, combattants et matchups — pas de prédictions FightScope.",
        starter: "Probabilités de victoire, avantage prédit et facteurs clés de matchup.",
        pro: "Analyse profonde, FightScope Rating, scénarios et stats avancées.",
      },
    },
    faq: {
      heading: "QUESTIONS FRÉQUENTES",
      intro: "Réponses claires sur l\u2019accès, le fonctionnement des analyses, et ce que FightScope est — et n\u2019est pas.",
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
