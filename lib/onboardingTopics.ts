// Static display config for onboarding topic cards.
// The `slug` field must match the `topic` column in OnboardingStarter.

export interface OnboardingTopic {
  slug: string;
  displayName: string;
  emoji: string;
  color: string;        // card accent / background tint
  description: string;  // one-liner shown on the card
}

export const ONBOARDING_TOPICS: OnboardingTopic[] = [
  {
    slug: "chocolate",
    displayName: "Chocolate Bars",
    emoji: "🍫",
    color: "#7C3F2F",
    description: "Kit Kat vs Snickers. It's personal.",
  },
  {
    slug: "fast-food",
    displayName: "Fast Food",
    emoji: "🍔",
    color: "#C44545",
    description: "Golden arches or golden ticket?",
  },
  {
    slug: "pokemon",
    displayName: "Pokémon",
    emoji: "⚡",
    color: "#E08C2C",
    description: "Gen 1. No arguments.",
  },
  {
    slug: "marvel",
    displayName: "MCU Movies",
    emoji: "🦸",
    color: "#4A5568",
    description: "Which hit different. Which didn't.",
  },
  {
    slug: "streaming",
    displayName: "Streaming Services",
    emoji: "📺",
    color: "#2D3748",
    description: "Your actual watch time doesn't lie.",
  },
  {
    slug: "pizza",
    displayName: "Pizza Toppings",
    emoji: "🍕",
    color: "#97C459",
    description: "Pineapple included. Brace yourself.",
  },
  {
    slug: "disney",
    displayName: "Disney Films",
    emoji: "✨",
    color: "#5DCAA5",
    description: "The childhood canon, ranked.",
  },
  {
    slug: "gaming",
    displayName: "Gaming Consoles",
    emoji: "🎮",
    color: "#85B7EB",
    description: "The console wars, settled by data.",
  },
];

export const ONBOARDING_TOPIC_MAP = new Map(
  ONBOARDING_TOPICS.map((t) => [t.slug, t])
);
