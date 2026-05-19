import { prisma } from "@/lib/prisma";
import LandingNav from "./LandingNav";
import HeroCta from "./HeroCta";
import { COPY, HERO_LIST_TOKEN } from "./content";

const TIER_STYLE: Record<string, { text: string }> = {
  S: { text: "#ffffff" },
  A: { text: "#2A1A04" },
  B: { text: "#173404" },
  C: { text: "#04342C" },
  D: { text: "#042C53" },
  F: { text: "#26215C" },
};

type HeroTier = { id: number; title: string; color: string; value: number };
type HeroItem = {
  id: number;
  name: string | null;
  img: string | null;
  color: string | null;
  short_label: string | null;
};

async function fetchHeroData() {
  const list = await (prisma.list as any).findFirst({
    where: { id: 1 },
    select: {
      id: true,
      title: true,
      createdById: true,
      tiers: { select: { id: true, title: true, color: true, value: true } },
      items: {
        select: {
          id: true,
          name: true,
          img: true,
          color: true,
          short_label: true,
        },
      },
    },
  });

  if (!list) return null;

  const sortedTiers = (list.tiers as HeroTier[])
    .filter((t) => t.value !== 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const rankings = await prisma.ranking.findMany({
    where: {
      itemId: { in: (list.items as HeroItem[]).map((i) => i.id) },
      userId: list.createdById as number,
    },
    select: { itemId: true, value: true },
  });

  const rankMap = new Map(rankings.map((r) => [r.itemId, r.value]));
  const tierValueToIdx = new Map(sortedTiers.map((t, i) => [t.value, i]));
  const tierItems: HeroItem[][] = sortedTiers.map(() => []);

  for (const item of list.items as HeroItem[]) {
    const value = rankMap.get(item.id);
    if (!value || value === 0) continue;
    const idx = tierValueToIdx.get(value);
    if (idx !== undefined && tierItems[idx].length < 5) {
      tierItems[idx].push(item);
    }
  }

  return { listTitle: list.title as string, tiers: sortedTiers, tierItems };
}

function ItemChip({ item }: { item: HeroItem }) {
  if (item.img) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${item.img}?tr=w-72,h-72,fo-auto`}
        alt={item.name ?? ""}
        width={36}
        height={36}
        className="w-9 h-9 rounded-[6px] object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div
      className="w-9 h-9 rounded-[6px] flex items-center justify-center text-[10px] font-[600] text-white flex-shrink-0"
      style={{ backgroundColor: item.color ?? "#334155" }}
      title={item.name ?? ""}
    >
      {item.short_label ?? item.name?.charAt(0) ?? "—"}
    </div>
  );
}

function TierRow({ tier, items }: { tier: HeroTier; items: HeroItem[] }) {
  const textColor = TIER_STYLE[tier.title]?.text ?? "#ffffff";

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-9 h-9 flex-shrink-0 rounded-[6px] flex items-center justify-center font-bold text-[13px] select-none"
        style={{ backgroundColor: tier.color, color: textColor }}
      >
        {tier.title.charAt(0)}
      </div>
      <div className="flex items-center flex-wrap gap-1.5">
        {items.map((item) => (
          <ItemChip key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function TierVisual({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof fetchHeroData>>>;
}) {
  return (
    <div className="relative w-full max-w-[440px]">
      <div
        className="rounded-[16px] p-5 flex flex-col gap-3"
        style={{ backgroundColor: "#0F1828", border: "1px solid #1E2C44" }}
      >
        <p className="text-[11px] font-[600] text-rk-muted uppercase tracking-[0.08em] mb-0.5">
          {data.listTitle}
        </p>

        {data.tiers.map((tier, i) => (
          <TierRow key={tier.id} tier={tier} items={data.tierItems[i]} />
        ))}
      </div>

      {/* Floating alignment badge */}
      <div
        className="absolute -bottom-4 -right-4 rounded-[10px] px-4 py-2.5 flex flex-col gap-0.5"
        style={{
          backgroundColor: "#142036",
          border: "1px solid #1E2C44",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <span className="text-[22px] font-bold text-rk-accent leading-none">
          {COPY.heroAlignmentPct}%
        </span>
        <span className="text-[11px] text-rk-secondary leading-none">
          aligned with {COPY.heroCreatorHandle}
        </span>
      </div>
    </div>
  );
}

export default async function Hero() {
  const heroData = await fetchHeroData();

  return (
    <section className="min-h-screen flex flex-col">
      <LandingNav />

      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-6 pt-16 sm:px-10 max-w-6xl mx-auto">
        {/* Left — copy + CTAs */}
        <div className="flex flex-col gap-6 flex-1 max-w-[480px]">
          <p className="text-[13px] font-[600] text-rk-accent uppercase tracking-[0.1em]">
            {COPY.eyebrow}
          </p>

          <h1 className="text-[52px] sm:text-[64px] font-bold text-rk-primary leading-[1.05] tracking-tight whitespace-pre-line">
            {COPY.headline}
          </h1>

          <p className="text-[16px] text-rk-secondary leading-relaxed max-w-[400px]">
            {COPY.subhead}
          </p>

          <HeroCta />
        </div>

        {/* Right — tier visual */}
        {heroData && (
          <div className="flex-1 flex items-center justify-center lg:justify-end pb-8">
            <TierVisual data={heroData} />
          </div>
        )}
      </div>
    </section>
  );
}
