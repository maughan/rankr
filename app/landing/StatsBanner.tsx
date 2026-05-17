"use client";

import { useEffect, useRef, useState } from "react";

interface Stats {
  lists: number;
  rankings: number;
  rankers: number;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;

    fromRef.current = value;
    startRef.current = null;

    function tick(now: number) {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(
        Math.round(fromRef.current + (target - fromRef.current) * eased)
      );
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

function StatItem({
  value,
  label,
  delay,
}: {
  value: number;
  label: string;
  delay: number;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setActive(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const displayed = useCountUp(active ? value : 0);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[36px] sm:text-[44px] font-bold text-rk-accent leading-none tabular-nums">
        {fmt(displayed)}
      </span>
      <span className="text-[11px] text-rk-muted uppercase tracking-[0.1em]">
        {label}
      </span>
    </div>
  );
}

const REFRESH_INTERVAL = 60_000;

export default function StatsBanner() {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  if (!stats) {
    return (
      <section className="py-14 border-y" style={{ borderColor: "#1E2C44" }}>
        <div className="flex items-center justify-center gap-10 sm:gap-20 flex-wrap px-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-10 w-16 rounded-[6px] bg-rk-surface animate-pulse" />
              <div className="h-3 w-20 rounded-[4px] bg-rk-surface animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const items: { value: number; label: string }[] = [
    { value: stats.lists, label: "stacks created" },
    { value: stats.rankings, label: "items ranked" },
    { value: stats.rankers, label: "stackers" },
  ];

  return (
    <section className="py-14 border-y" style={{ borderColor: "#1E2C44" }}>
      <div className="flex items-center justify-center gap-8 sm:gap-16 flex-wrap px-6">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-8 sm:gap-16">
            <StatItem value={item.value} label={item.label} delay={i * 120} />
            {i < items.length - 1 && (
              <span
                className="text-rk-stroke text-[24px] select-none hidden sm:block"
                aria-hidden
              >
                ·
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
