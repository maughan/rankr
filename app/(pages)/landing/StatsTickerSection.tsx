import { prisma } from "@/lib/prisma";

const THRESHOLDS = { rankings: 500, lists: 25, rankers: 50 };

async function fetchStats() {
  try {
    const [rankings, lists, rankers] = await Promise.all([
      prisma.ranking.count({ where: { value: { not: 0 } } }),
      (prisma.list as any).count({ where: { is_shareable: true } }),
      prisma.user.count(),
    ]);
    return { rankings, lists, rankers };
  } catch {
    return { rankings: 0, lists: 0, rankers: 0 };
  }
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default async function StatsTickerSection() {
  const stats = await fetchStats();

  if (
    stats.rankings < THRESHOLDS.rankings ||
    stats.lists < THRESHOLDS.lists ||
    stats.rankers < THRESHOLDS.rankers
  ) {
    return null;
  }

  const items = [
    { label: "rankings", value: fmt(stats.rankings) },
    { label: "lists ranked", value: fmt(stats.lists) },
    { label: "rankers", value: fmt(stats.rankers) },
  ];

  return (
    <section
      className="py-10 border-y"
      style={{ borderColor: "#1E2C44" }}
    >
      <div className="flex items-center justify-center gap-8 sm:gap-16 flex-wrap px-6">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-8 sm:gap-16">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[32px] font-bold text-rk-accent leading-none">
                {item.value}
              </span>
              <span className="text-[12px] text-rk-muted uppercase tracking-[0.08em]">
                {item.label}
              </span>
            </div>
            {i < items.length - 1 && (
              <span className="text-rk-stroke text-[24px] select-none hidden sm:block">
                ·
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
