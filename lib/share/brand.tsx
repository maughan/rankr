// Shared brand primitives for share card templates.
// All styles are inline — Satori does not process Tailwind class names.

import { COLORS, TIER_COLORS } from "./tokens";

// ── Brand mark + wordmark ──────────────────────────────────────────────────────

export function Brand({ scale = 1 }: { scale?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 * scale }}>
      <div
        style={{
          width: 12 * scale,
          height: 12 * scale,
          backgroundColor: COLORS.accent,
          borderRadius: 3 * scale,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 17 * scale,
          fontWeight: 500,
          color: COLORS.primary,
          letterSpacing: "-0.3px",
          lineHeight: 1,
        }}
      >
        TierStack.io
      </span>
    </div>
  );
}

// ── Footer URL line ───────────────────────────────────────────────────────────

export function ShareFoot({ url, scale = 1 }: { url: string; scale?: number }) {
  return (
    <span
      style={{
        fontSize: 13 * scale,
        color: COLORS.tertiary,
        letterSpacing: "0.04em",
        lineHeight: 1,
      }}
    >
      {url}
    </span>
  );
}

// ── Tier badge ────────────────────────────────────────────────────────────────

export function TierBadge({ tier, size = 40 }: { tier: string; size?: number }) {
  const colors = TIER_COLORS[tier.toUpperCase()] ?? { bg: "#334155", text: "#ffffff" };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        backgroundColor: colors.bg,
        borderRadius: 4,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: Math.round(size * 0.45),
          fontWeight: 700,
          color: colors.text,
          lineHeight: 1,
        }}
      >
        {tier.toUpperCase()}
      </span>
    </div>
  );
}

// ── Horizontal divider ────────────────────────────────────────────────────────

export function Divider() {
  return (
    <div
      style={{
        width: "100%",
        height: 1,
        backgroundColor: COLORS.stroke,
      }}
    />
  );
}
