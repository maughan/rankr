export const HERO_LIST_TOKEN =
  process.env.LANDING_HERO_LIST_TOKEN ?? "GN0TAqTv_z5ePaIb";

export const COPY = {
  eyebrow: "Tier lists. But actually fun.",
  headline: "Your taste,\npeer-reviewed.",
  subhead:
    "Make stacks. See who agrees, who's dead wrong, and what the crowd actually thinks. Compare your ranking against anyone.",
  ctaPrimary: "Start ranking",
  ctaSecondary: "Log in",
  heroAlignmentPct: 78,
  heroCreatorHandle: "@tierstack",

  featuredHeading: "Trending stacks",

  finalHeadline: "Ready to argue about something?",
  finalCta: "Start your first stack",
  finalUnderline: "No credit card. No spam. Just tier lists.",

  footerTagline: "Tier lists. But actually fun.",
};

export const FEATURES = [
  {
    icon: "◈",
    title: "Rank anything",
    body: "Movies, food, people, places — if it has an opinion, it belongs in a stack.",
  },
  {
    icon: "⇄",
    title: "Compare rankings",
    body: "Share your stack and get a head-to-head alignment score. 100% means you're twins.",
  },
  {
    icon: "🔥",
    title: "Find the hot takes",
    body: "See what the crowd ranked highest — and exactly where you went your own way.",
  },
] as const;
