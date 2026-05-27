export const CATEGORIES = [
  {
    slug: "food",
    label: "Food & Drink",
    color: "#F59E0B",
    description: "Restaurants, dishes, snacks, and drinks that deserve a definitive ranking.",
  },
  {
    slug: "gaming",
    label: "Gaming",
    color: "#8B5CF6",
    description: "Games, characters, franchises, and moments — ranked by the community.",
  },
  {
    slug: "music",
    label: "Music",
    color: "#EC4899",
    description: "Albums, artists, songs, and genres. Your taste vs. the crowd's.",
  },
  {
    slug: "movies",
    label: "Movies",
    color: "#3B82F6",
    description: "Films, directors, and performances — the definitive cinematic rankings.",
  },
  {
    slug: "tv",
    label: "TV Shows",
    color: "#06B6D4",
    description: "Series, seasons, episodes, and characters from across every screen.",
  },
  {
    slug: "sports",
    label: "Sports",
    color: "#22C55E",
    description: "Athletes, teams, moments, and rivalries that defined the game.",
  },
  {
    slug: "people",
    label: "People",
    color: "#F97316",
    description: "Cultural figures, creators, and characters who made their mark.",
  },
  {
    slug: "brands",
    label: "Brands",
    color: "#EF4444",
    description: "Companies, products, and logos ranked by who actually uses them.",
  },
  {
    slug: "tech",
    label: "Tech",
    color: "#6366F1",
    description: "Apps, tools, gadgets, and platforms — ranked by the people who live in them.",
  },
  {
    slug: "other",
    label: "Other",
    color: "#64748B",
    description: "Everything that doesn't fit neatly elsewhere — still worth ranking.",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export type CategoryMeta = (typeof CATEGORIES)[number];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
export const CATEGORY_SLUGS_SET = new Set<string>(CATEGORY_SLUGS);

export function getCategoryMeta(slug: string): CategoryMeta {
  return (
    CATEGORIES.find((c) => c.slug === slug) ??
    (CATEGORIES.find((c) => c.slug === "other") as CategoryMeta)
  );
}
