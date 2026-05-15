export const ICON_NAMES = [
  "ti-stack-2",
  "ti-burger",
  "ti-cookie",
  "ti-candy",
  "ti-pizza",
  "ti-robot",
  "ti-brain",
  "ti-rocket",
  "ti-heart",
  "ti-star",
  "ti-leaf",
  "ti-tree",
  "ti-sun",
  "ti-mountain",
  "ti-moon",
  "ti-mood-happy",
  "ti-music",
  "ti-movie",
  "ti-camera",
  "ti-user",
] as const;

export type CategoryIcon = (typeof ICON_NAMES)[number];

export const COLOR_NAMES = [
  "amber",
  "coral",
  "blue",
  "teal",
  "red",
  "green",
  "purple",
  "pink",
] as const;

export type CategoryColor = (typeof COLOR_NAMES)[number];

export const COLOR_HEX: Record<CategoryColor, string> = {
  amber: "#F59E0B",
  coral: "#F97316",
  blue: "#3B82F6",
  teal: "#14B8A6",
  red: "#EF4444",
  green: "#22C55E",
  purple: "#8B5CF6",
  pink: "#EC4899",
};

export const ICON_NAMES_SET = new Set<string>(ICON_NAMES);
export const COLOR_NAMES_SET = new Set<string>(COLOR_NAMES);
