// Personal verdict OG card — 1200×675. Rendered for /r/[token]/v/[ref] unfurls
// where a signed ref identifies the sharer, so we can show their own result:
// crowd alignment % (headline), creator alignment % (secondary), hottest take.
import type { ReactElement } from "react";
import { Brand, ShareFoot, TierBadge } from "@/lib/share/brand";
import { COLORS } from "@/lib/share/tokens";

export interface OgVerdictInput {
  title: string;
  crowdPct: number;
  rankerCount: number;
  creatorPct: number | null;
  creatorHandle: string | null;
  hottestTake: {
    itemName: string;
    yourTier: string;
    crowdTier: string;
  } | null;
}

const W = 1200;
const H = 675;
const PAD = 60;

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function ogVerdictCard(data: OgVerdictInput): ReactElement {
  const title = trunc(data.title, 52);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: W,
        height: H,
        backgroundColor: COLORS.page,
        padding: PAD,
        fontFamily: "Geist",
      }}
    >
      <Brand scale={1.3} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 26, color: COLORS.secondary }}>{title}</span>

        {/* Headline metric — crowd alignment */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span
            style={{
              fontSize: 132,
              fontWeight: 700,
              color: COLORS.primary,
              lineHeight: 1,
            }}
          >
            {Math.round(data.crowdPct)}%
          </span>
          <span style={{ fontSize: 30, color: COLORS.secondary }}>
            aligned with the crowd
          </span>
        </div>

        {/* Secondary metric — creator alignment */}
        {data.creatorPct !== null && (
          <span style={{ fontSize: 24, color: COLORS.muted }}>
            vs{" "}
            <span style={{ color: COLORS.secondary }}>
              {data.creatorHandle ? `@${data.creatorHandle}` : "the creator"}
            </span>
            :{" "}
            <span style={{ color: COLORS.primary, fontWeight: 700 }}>
              {Math.round(data.creatorPct)}%
            </span>
          </span>
        )}

        {/* Hottest take */}
        {data.hottestTake && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 14,
            }}
          >
            <span style={{ fontSize: 22, color: COLORS.muted }}>
              hottest take:
            </span>
            <span
              style={{ fontSize: 22, fontWeight: 700, color: COLORS.primary }}
            >
              {trunc(data.hottestTake.itemName, 28)}
            </span>
            <TierBadge tier={data.hottestTake.yourTier} size={34} />
            <span style={{ fontSize: 20, color: COLORS.tertiary }}>vs</span>
            <TierBadge tier={data.hottestTake.crowdTier} size={34} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <ShareFoot url="tierstack.dev" scale={1.4} />
        {data.rankerCount > 0 && (
          <span style={{ fontSize: 18, color: COLORS.tertiary }}>
            {data.rankerCount} stacker{data.rankerCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
