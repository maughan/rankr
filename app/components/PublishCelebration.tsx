"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { S } from "@/app/content/strings";

const CONFETTI_COLORS = [
  "#F59E0B", "#7C3AED", "#3B82F6", "#10B981",
  "#EC4899", "#F97316", "#EF4444", "#06B6D4",
];

interface Piece {
  id: number;
  color: string;
  left: string;
  width: number;
  height: number;
  duration: string;
  delay: string;
  rotStart: string;
  rotEnd: string;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

interface Props {
  listTitle: string;
  listHref: string;
  onDismiss: () => void;
  onShare?: () => void;
}

export default function PublishCelebration({
  listTitle,
  listHref,
  onDismiss,
  onShare,
}: Props) {
  const reduced = useReducedMotion();

  const pieces = useMemo<Piece[]>(() => {
    if (reduced) return [];
    return Array.from({ length: 64 }, (_, i) => {
      const w = 6 + Math.random() * 6;
      return {
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        left: `${Math.random() * 100}%`,
        width: w,
        height: w * (1.4 + Math.random() * 0.6),
        duration: `${2.4 + Math.random() * 1.8}s`,
        delay: `${Math.random() * 1.2}s`,
        rotStart: `${Math.random() * 360}deg`,
        rotEnd: `${Math.random() * 720 - 360}deg`,
      };
    });
  }, [reduced]);

  return (
    <div className="fixed inset-0 z-50 bg-rk-page flex flex-col items-center justify-center overflow-hidden">
      {/* Confetti */}
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 rounded-[2px]"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            opacity: 0,
            ["--rot-start" as string]: p.rotStart,
            ["--rot-end" as string]: p.rotEnd,
            animation: `rk-confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
          }}
        />
      ))}

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-sm"
        style={{
          animation: reduced
            ? "none"
            : "rk-pub-pop 0.5s 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        {/* Live badge */}
        <div className="px-3 py-1 rounded-full bg-rk-accent/15 border border-rk-accent/30">
          <span className="text-[11px] font-[600] text-rk-accent tracking-widest uppercase">
            Live
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] sm:text-[40px] font-bold text-rk-primary tracking-tight leading-tight">
            {S.publish.celebrationTitle}
          </h1>
          <p className="text-[14px] text-rk-secondary leading-relaxed">
            {S.publish.celebrationSubhead(listTitle)}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {onShare && (
            <button
              onClick={onShare}
              className="w-full sm:w-auto flex-1 px-5 py-2.5 text-[14px] font-[500] bg-rk-accent text-white rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              {S.publish.celebrationShare}
            </button>
          )}
          <a
            href={`${listHref}/s`}
            className="w-full sm:w-auto flex-1 px-5 py-2.5 text-[14px] font-[500] text-rk-primary border border-rk-stroke rounded-[10px] hover:border-rk-muted transition-colors text-center"
          >
            {S.publish.celebrationCta}
          </a>
        </div>

        <button
          onClick={onDismiss}
          className="text-[12px] text-rk-tertiary hover:text-rk-muted transition-colors cursor-pointer"
        >
          {S.publish.celebrationDismiss}
        </button>
      </div>
    </div>
  );
}
