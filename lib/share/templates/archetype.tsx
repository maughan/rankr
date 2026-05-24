// Archetype share card — user's taste archetype with evidence receipts.
// Server-resolves userId from JWT (injected by the route handler); no token needed.

import { prisma } from "@/lib/prisma";
import { Brand } from "@/lib/share/brand";
import { ShareCardError } from "@/lib/share/errors";
import { COLORS, TIER_COLORS } from "@/lib/share/tokens";
import {
  Format,
  FORMATS,
  ArchetypeCardData,
  TemplateModule,
} from "@/lib/share/types";
import { archetypeStatPct } from "@/lib/insightsConfig";
import type { ArchetypeSlug, ArchetypeStats } from "@/lib/insightsConfig";
import { S } from "@/app/content/strings";

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchData(params: URLSearchParams): Promise<ArchetypeCardData> {
  const userIdStr = params.get("userId");
  if (!userIdStr) throw new ShareCardError(401, "Not authenticated");
  const userId = Number(userIdStr);
  if (!userId || isNaN(userId)) throw new ShareCardError(401, "Invalid user");

  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: { archetype: true, archetype_stats: true },
  });

  if (!user) throw new ShareCardError(404, "User not found");
  if (!user.archetype || !user.archetype_stats)
    throw new ShareCardError(400, "Rank more lists to unlock your archetype card.");

  const archetype = user.archetype as ArchetypeSlug;
  const stats = user.archetype_stats as ArchetypeStats;
  const config = S.archetypes[archetype];
  const pct = archetypeStatPct(archetype, stats.signals);

  return {
    archetypeName: config.name,
    tagline: config.tagline,
    color: config.color,
    statLine: (config.statLine as (pct?: number) => string)(pct),
    evidence: stats.evidence,
    rankedItemCount: stats.rankedItemCount,
    rankedListCount: stats.rankedListCount,
  };
}

// ── Typography tokens — all values are absolute px on the final canvas ─────────

type T = {
  pad: number;
  brandScale: number;
  footScale: number;
  pillFont: number;
  pillPadH: number;
  pillPadV: number;
  pillRadius: number;
  accentBarWidth: number;
  accentPadLeft: number;
  nameFont: number;
  taglineFont: number;
  statFont: number;
  sectionLabelFont: number;
  evidenceNameFont: number;
  evidenceMetaFont: number;
  evidenceBadgeSize: number;
  evidenceRowPadH: number;
  evidenceRowPadV: number;
  evidenceRowGap: number;
  evidenceRowRadius: number;
  sectionGap: number;
  nameCut: number;
  metaCut: number;
};

const TOKENS: Record<Format, T> = {
  square: {
    pad: 72,
    brandScale: 1.75,
    footScale: 2.08,
    pillFont: 24,
    pillPadH: 16,
    pillPadV: 9,
    pillRadius: 8,
    accentBarWidth: 4,
    accentPadLeft: 28,
    nameFont: 72,
    taglineFont: 27,
    statFont: 24,
    sectionLabelFont: 22,
    evidenceNameFont: 38,
    evidenceMetaFont: 24,
    evidenceBadgeSize: 52,
    evidenceRowPadH: 32,
    evidenceRowPadV: 26,
    evidenceRowGap: 18,
    evidenceRowRadius: 14,
    sectionGap: 48,
    nameCut: 20,
    metaCut: 26,
  },
  wide: {
    pad: 56,
    brandScale: 1.3,
    footScale: 1.62,
    pillFont: 20,
    pillPadH: 14,
    pillPadV: 8,
    pillRadius: 7,
    accentBarWidth: 3,
    accentPadLeft: 20,
    nameFont: 50,
    taglineFont: 20,
    statFont: 18,
    sectionLabelFont: 15,
    evidenceNameFont: 26,
    evidenceMetaFont: 17,
    evidenceBadgeSize: 40,
    evidenceRowPadH: 18,
    evidenceRowPadV: 16,
    evidenceRowGap: 10,
    evidenceRowRadius: 8,
    sectionGap: 24,
    nameCut: 18,
    metaCut: 22,
  },
  story: {
    pad: 90,
    brandScale: 2.2,
    footScale: 2.54,
    pillFont: 30,
    pillPadH: 20,
    pillPadV: 12,
    pillRadius: 10,
    accentBarWidth: 5,
    accentPadLeft: 36,
    nameFont: 88,
    taglineFont: 33,
    statFont: 30,
    sectionLabelFont: 28,
    evidenceNameFont: 48,
    evidenceMetaFont: 30,
    evidenceBadgeSize: 66,
    evidenceRowPadH: 40,
    evidenceRowPadV: 32,
    evidenceRowGap: 24,
    evidenceRowRadius: 18,
    sectionGap: 64,
    nameCut: 22,
    metaCut: 30,
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function ArchetypePill({ t }: { t: T }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "rgba(74, 138, 232, 0.12)",
        border: "1px solid rgba(74, 138, 232, 0.3)",
        borderRadius: t.pillRadius,
        padding: `${t.pillPadV}px ${t.pillPadH}px`,
      }}
    >
      <span
        style={{
          fontSize: t.pillFont,
          fontWeight: 700,
          color: COLORS.accent,
          letterSpacing: "0.08em",
          lineHeight: 1,
        }}
      >
        TASTE ARCHETYPE
      </span>
    </div>
  );
}

function EvidenceRow({
  receipt,
  t,
}: {
  receipt: ArchetypeCardData["evidence"][number];
  t: T;
}) {
  const nameText =
    receipt.itemName.length > t.nameCut
      ? receipt.itemName.slice(0, t.nameCut - 1) + "…"
      : receipt.itemName;
  const metaText =
    receipt.listName.length > t.metaCut
      ? "on " + receipt.listName.slice(0, t.metaCut - 1) + "…"
      : "on " + receipt.listName;

  const yourColors = TIER_COLORS[receipt.yourTier.toUpperCase()] ?? {
    bg: "#334155",
    text: "#ffffff",
  };
  const crowdColors = TIER_COLORS[receipt.crowdTier.toUpperCase()] ?? {
    bg: "#334155",
    text: "#ffffff",
  };
  const badgeSize = t.evidenceBadgeSize;
  const badgeFontSize = Math.round(badgeSize * 0.52);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.stroke}`,
        borderRadius: t.evidenceRowRadius,
        padding: `${t.evidenceRowPadV}px ${t.evidenceRowPadH}px`,
        gap: t.evidenceRowPadH,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: Math.round(t.evidenceMetaFont * 0.35),
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontSize: t.evidenceNameFont,
            fontWeight: 600,
            color: COLORS.primary,
            lineHeight: 1.1,
            overflow: "hidden",
            maxHeight: Math.ceil(t.evidenceNameFont * 1.1),
          }}
        >
          {nameText}
        </span>
        <span
          style={{
            fontSize: t.evidenceMetaFont,
            color: COLORS.muted,
            lineHeight: 1,
            overflow: "hidden",
            maxHeight: Math.ceil(t.evidenceMetaFont * 1.1),
          }}
        >
          {metaText}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: Math.round(badgeSize * 0.2),
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: badgeSize,
            height: badgeSize,
            backgroundColor: yourColors.bg,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: badgeFontSize,
              fontWeight: 700,
              color: yourColors.text,
              lineHeight: 1,
            }}
          >
            {receipt.yourTier.toUpperCase()}
          </span>
        </div>
        <span
          style={{
            fontSize: Math.round(t.evidenceMetaFont * 0.85),
            color: COLORS.tertiary,
            lineHeight: 1,
          }}
        >
          vs
        </span>
        <div
          style={{
            width: badgeSize,
            height: badgeSize,
            backgroundColor: crowdColors.bg,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: badgeFontSize,
              fontWeight: 700,
              color: crowdColors.text,
              lineHeight: 1,
            }}
          >
            {receipt.crowdTier.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

function ArchetypeFooter({ scale }: { scale: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span
        style={{
          fontSize: 13 * scale,
          color: COLORS.primary,
          letterSpacing: "0.04em",
          lineHeight: 1,
          fontWeight: "bold",
        }}
      >
        {"What's your archetype?"}
      </span>
      <span
        style={{
          fontSize: 13 * scale,
          color: COLORS.tertiary,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        tierstack.dev
      </span>
    </div>
  );
}

// ── Format-specific card layouts ───────────────────────────────────────────────

function SquareOrStoryCard({
  data,
  format,
}: {
  data: ArchetypeCardData;
  format: "square" | "story";
}) {
  const t = TOKENS[format];
  const { width, height } = FORMATS[format];
  const listWord = data.rankedListCount !== 1 ? "lists" : "list";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: COLORS.page,
        padding: t.pad,
        fontFamily: "Geist",
      }}
    >
      {/* Zone A — brand row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Brand scale={t.brandScale} />
        <ArchetypePill t={t} />
      </div>

      {/* Zone B — hero + evidence, vertically centred */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: t.sectionGap,
        }}
      >
        {/* Hero — left accent bar + name block */}
        <div
          style={{
            display: "flex",
            borderLeft: `${t.accentBarWidth}px solid ${data.color}`,
            paddingLeft: t.accentPadLeft,
            flexDirection: "column",
            gap: Math.round(t.taglineFont * 0.55),
          }}
        >
          <span
            style={{
              fontSize: t.nameFont,
              fontWeight: 700,
              color: data.color,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {data.archetypeName}
          </span>
          <span
            style={{
              fontSize: t.taglineFont,
              color: COLORS.secondary,
              lineHeight: 1.3,
            }}
          >
            {`"${data.tagline}"`}
          </span>
          <span
            style={{
              fontSize: t.statFont,
              color: COLORS.muted,
              lineHeight: 1,
            }}
          >
            {data.statLine}
          </span>
          <span
            style={{
              fontSize: Math.round(t.statFont * 0.88),
              color: COLORS.tertiary,
              lineHeight: 1,
            }}
          >
            {data.rankedItemCount} items across {data.rankedListCount} {listWord}
          </span>
        </div>

        {/* Evidence section */}
        {data.evidence.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: Math.round(t.evidenceRowGap * 0.9),
            }}
          >
            <span
              style={{
                fontSize: t.sectionLabelFont,
                fontWeight: 600,
                color: COLORS.muted,
                letterSpacing: "0.08em",
                lineHeight: 1,
              }}
            >
              EXHIBIT A — HOTTEST TAKES
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: t.evidenceRowGap,
              }}
            >
              {data.evidence.map((r, i) => (
                <EvidenceRow key={i} receipt={r} t={t} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zone C — footer */}
      <ArchetypeFooter scale={t.footScale} />
    </div>
  );
}

function WideCard({ data }: { data: ArchetypeCardData }) {
  const t = TOKENS.wide;
  const { width, height } = FORMATS.wide;
  const listWord = data.rankedListCount !== 1 ? "lists" : "list";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: COLORS.page,
        padding: t.pad,
        fontFamily: "Geist",
      }}
    >
      {/* Zone A — brand row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Brand scale={t.brandScale} />
        <ArchetypePill t={t} />
      </div>

      {/* Zone B — two columns */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: 48,
          marginTop: 24,
        }}
      >
        {/* Left — archetype identity */}
        <div
          style={{
            display: "flex",
            flex: 1,
            borderLeft: `${t.accentBarWidth}px solid ${data.color}`,
            paddingLeft: t.accentPadLeft,
            flexDirection: "column",
            justifyContent: "center",
            gap: Math.round(t.taglineFont * 0.5),
          }}
        >
          <span
            style={{
              fontSize: t.nameFont,
              fontWeight: 700,
              color: data.color,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {data.archetypeName}
          </span>
          <span
            style={{
              fontSize: t.taglineFont,
              color: COLORS.secondary,
              lineHeight: 1.3,
            }}
          >
            {`"${data.tagline}"`}
          </span>
          <span
            style={{
              fontSize: t.statFont,
              color: COLORS.muted,
              lineHeight: 1,
            }}
          >
            {data.statLine}
          </span>
          <span
            style={{
              fontSize: Math.round(t.statFont * 0.88),
              color: COLORS.tertiary,
              lineHeight: 1,
            }}
          >
            {data.rankedItemCount} items across {data.rankedListCount} {listWord}
          </span>
        </div>

        {/* Right — evidence rows */}
        {data.evidence.length > 0 && (
          <div
            style={{
              display: "flex",
              flex: 1.2,
              flexDirection: "column",
              justifyContent: "center",
              gap: t.evidenceRowGap,
            }}
          >
            {data.evidence.map((r, i) => (
              <EvidenceRow key={i} receipt={r} t={t} />
            ))}
          </div>
        )}
      </div>

      {/* Zone C — footer */}
      <div style={{ marginTop: 16 }}>
        <ArchetypeFooter scale={t.footScale} />
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export const archetypeCard: TemplateModule = {
  async handler(params: URLSearchParams, format: Format) {
    const data = await fetchData(params);
    if (format === "wide") return <WideCard data={data} />;
    return <SquareOrStoryCard data={data} format={format} />;
  },
};
