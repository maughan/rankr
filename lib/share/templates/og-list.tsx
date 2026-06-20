// OG image template for list pages — wide 1200×675.
// Standalone (not registered in the share card renderer — no token or viewer required).
import type { ReactElement } from "react";
import { Brand, TierBadge } from "@/lib/share/brand";
import { COLORS } from "@/lib/share/tokens";

export interface OgListVerdict {
  // Letter/title of the crowd's consensus top tier (e.g. "S").
  topTierLabel: string;
  // Names of the items the crowd placed in that top tier.
  topTierItems: string[];
  // The single most contested item (highest spread of rankings), if any.
  divisiveItem: string | null;
}

export interface OgListInput {
  title: string;
  description: string | null;
  creator: string;
  itemCount: number;
  rankerCount: number;
  colors: (string | null)[];
  // Crowd-level verdict — present only once a list has real rankings.
  // When absent the card falls back to the plain colour-tile layout.
  verdict?: OgListVerdict | null;
}

const W = 1200;
const H = 675;
const PAD = 60;

// Tile grid constants — 4 per row, 3 rows max (12 tiles)
const TILE = 90;
const TILE_GAP = 8;
const TILES_PER_ROW = 4;
const MAX_TILES = 12;

// Column layout (total content width: 1080)
const RIGHT_COL = TILES_PER_ROW * TILE + (TILES_PER_ROW - 1) * TILE_GAP; // 384
const COL_GAP = 56;
const LEFT_COL = W - 2 * PAD - RIGHT_COL - COL_GAP; // 640

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function ogListCard(data: OgListInput): ReactElement {
  const title = trunc(data.title, 58);
  const desc = data.description ? trunc(data.description, 90) : null;

  const verdict =
    data.verdict &&
    (data.verdict.topTierItems.length > 0 || data.verdict.divisiveItem)
      ? data.verdict
      : null;

  const tiles = data.colors.slice(0, MAX_TILES);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < tiles.length; i += TILES_PER_ROW) {
    rows.push(tiles.slice(i, i + TILES_PER_ROW));
  }
  // Pad final row so the grid doesn't look ragged
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    while (last.length < TILES_PER_ROW) last.push(null);
  }
  // Fill to 3 rows with placeholders if fewer
  while (rows.length < 3) {
    rows.push(Array(TILES_PER_ROW).fill(null));
  }

  return (
    <div
      style={{
        display: "flex",
        width: W,
        height: H,
        backgroundColor: COLORS.page,
        padding: PAD,
        fontFamily: "Geist",
      }}
    >
      {/* Left column — brand + title + stats */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: LEFT_COL,
          marginRight: COL_GAP,
        }}
      >
        <Brand scale={1.3} />

        {/* Title + description, vertically centered */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 14,
          }}
        >
          <span
            style={{
              fontSize: 46,
              fontWeight: 700,
              color: COLORS.primary,
              lineHeight: 1.15,
            }}
          >
            {title}
          </span>
          {desc && (
            <span
              style={{
                fontSize: 21,
                color: COLORS.secondary,
                lineHeight: 1.3,
              }}
            >
              {desc}
            </span>
          )}
        </div>

        {/* Crowd verdict — the shareable hook: what the crowd actually decided */}
        {verdict && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 22,
            }}
          >
            {verdict.topTierItems.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <TierBadge tier={verdict.topTierLabel} size={44} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 15, color: COLORS.muted }}>
                    the crowd&apos;s top tier
                  </span>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: COLORS.primary,
                      lineHeight: 1.1,
                    }}
                  >
                    {trunc(verdict.topTierItems.slice(0, 3).join(", "), 46)}
                  </span>
                </div>
              </div>
            )}
            {verdict.divisiveItem && (
              <span style={{ fontSize: 19, color: COLORS.secondary }}>
                most divisive:{" "}
                <span style={{ color: COLORS.primary, fontWeight: 700 }}>
                  {trunc(verdict.divisiveItem, 30)}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, color: COLORS.muted }}>
            by {data.creator}
          </span>
          <span style={{ fontSize: 18, color: COLORS.tertiary }}>·</span>
          <span style={{ fontSize: 18, color: COLORS.muted }}>
            {data.itemCount} item{data.itemCount !== 1 ? "s" : ""}
          </span>
          {data.rankerCount > 0 && (
            <>
              <span style={{ fontSize: 18, color: COLORS.tertiary }}>·</span>
              <span style={{ fontSize: 18, color: COLORS.muted }}>
                {data.rankerCount} stacker{data.rankerCount !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right column — colour tile grid, vertically centred */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: TILE_GAP,
          width: RIGHT_COL,
        }}
      >
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: TILE_GAP }}>
            {row.map((color, ci) => (
              <div
                key={ci}
                style={{
                  width: TILE,
                  height: TILE,
                  backgroundColor: color ?? COLORS.stroke,
                  borderRadius: 10,
                  opacity: color ? 1 : 0.35,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
