// Design tokens for share card templates.
// Mirror globals.css — do not redeclare hex values elsewhere in template files.

export const COLORS = {
  page:      "#0A1220",
  surface:   "#142036",
  row:       "#0F1828",
  stroke:    "#1E2C44",
  primary:   "#E0E6F0",
  secondary: "#B0BCD0",
  muted:     "#6E7A92",
  tertiary:  "#4E5A72",
  accent:    "#4A8AE8",
} as const;

export const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  S: { bg: "#C44545", text: "#ffffff" },
  A: { bg: "#E08C2C", text: "#2A1A04" },
  B: { bg: "#97C459", text: "#173404" },
  C: { bg: "#5DCAA5", text: "#04342C" },
  D: { bg: "#85B7EB", text: "#042C53" },
  F: { bg: "#AFA9EC", text: "#26215C" },
};
