import Link from "next/link";
import Image from "next/image";
import { ImageKitLoader } from "@/lib/helpers";
import type { RichListCard as RichListCardData } from "@/lib/api/feedApi";
import GeneratedCover from "./GeneratedCover";

// Tier color map (mirrors the fallback palette used across the app)
const TIER_COLORS: Record<string, string> = {
  S: "#C44545",
  A: "#E08C2C",
  B: "#97C459",
  C: "#5DCAA5",
  D: "#85B7EB",
  F: "#AFA9EC",
};
const TIER_COLOR_FALLBACK = "#1E2C44";

function tierColor(title: string): string {
  return TIER_COLORS[title.trim().toUpperCase()] ?? TIER_COLOR_FALLBACK;
}

export default function RichListCard({ card }: { card: RichListCardData }) {
  const rankHref = `/s/${card.slug}-${card.short_id}/s`;
  const viewHref = `/s/${card.slug}-${card.short_id}`;
  const bars = card.tierStrip.filter((t) => t.itemCount > 0);

  return (
    <Link
      href={viewHref}
      className="rounded-[10px] border border-rk-stroke bg-rk-surface overflow-hidden cursor-pointer"
    >
      {/* Cover */}
      {card.img ? (
        <div className="relative h-[84px]">
          <Image
            loader={ImageKitLoader}
            src={card.img}
            alt=""
            fill
            sizes="300px"
            style={{ objectFit: "cover" }}
          />
        </div>
      ) : (
        <GeneratedCover colors={card.coverColors} title={card.title} />
      )}

      {/* Body */}
      <div className="p-3">
        {/* Title + twin pill */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-[500] text-rk-primary leading-snug min-w-0 truncate">
            {card.title}
          </p>
          {card.twinSignal && (
            <span
              className="flex-shrink-0 text-[10px] font-[500] rounded-full px-2 py-0.5 whitespace-nowrap"
              style={{
                color: "#1D9E75",
                backgroundColor: "rgba(29,158,117,0.14)",
              }}
            >
              {card.twinSignal.count} taste twin
              {card.twinSignal.count !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Stats line */}
        <p className="text-[11px] text-rk-muted mt-0.5">
          {card.item_count} items · {card.ranking_count} ranked ·{" "}
          {card.divisiveness}
        </p>

        {/* Tier strip */}
        {bars.length > 0 && (
          <div className="flex gap-0.5 mt-2 h-[5px]">
            {bars.map((t, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  flex: t.itemCount,
                  backgroundColor: tierColor(t.tierTitle),
                }}
              />
            ))}
          </div>
        )}

        {/* Rank it CTA */}
        <Link
          href={rankHref}
          className="inline-block mt-2 text-[12px] font-[500] hover:underline"
          style={{ color: "#4A8AE8" }}
        >
          Rank it →
        </Link>
      </div>
    </Link>
  );
}
