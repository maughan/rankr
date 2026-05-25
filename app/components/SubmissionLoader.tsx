"use client";

import { useEffect, useRef, useState } from "react";
import { IconFlame } from "@tabler/icons-react";
import { S } from "@/app/content/strings";
import { useReducedMotion } from "@/lib/useReducedMotion";

// Tunable: 0 = always TierShuffle, 1 = always Narrator
const NARRATOR_WEIGHT = 0.5;

const TIER_CHIPS: { label: string; bg: string; text: string; delay: number }[] =
  [
    { label: "S", bg: "#C44545", text: "#ffffff", delay: 0 },
    { label: "A", bg: "#E08C2C", text: "#2A1A04", delay: 0.12 },
    { label: "B", bg: "#97C459", text: "#173404", delay: 0.24 },
    { label: "C", bg: "#5DCAA5", text: "#04342C", delay: 0.36 },
    { label: "D", bg: "#AFA9EC", text: "#26215C", delay: 0.48 },
  ];

function NarratorLoader() {
  const reducedMotion = useReducedMotion();
  const messages = S.submissionLoader.narratorMessages;
  const [msgIndex, setMsgIndex] = useState(() =>
    Math.floor(Math.random() * messages.length)
  );
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 280);
    }, 1600);
    return () => clearInterval(id);
  }, [reducedMotion, messages.length]);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Icon tile */}
      <div
        className="w-14 h-14 rounded-[14px] flex items-center justify-center"
        style={{
          backgroundColor: "rgba(239,159,39,0.12)",
          animation: reducedMotion
            ? undefined
            : "rk-loader-pulse 1.4s ease-in-out infinite",
        }}
      >
        <IconFlame size={28} style={{ color: "#EF9F27" }} stroke={1.75} />
      </div>

      {/* Rotating message — min-height prevents layout shift between lines */}
      <p
        className="text-[14px] text-rk-secondary text-center"
        style={{
          minHeight: "1.4em",
          opacity: reducedMotion ? 1 : visible ? 1 : 0,
          transition: reducedMotion ? undefined : "opacity 280ms ease",
        }}
      >
        {messages[msgIndex]}
      </p>
    </div>
  );
}

function TierShuffleLoader() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Equalizer chips */}
      <div className="flex items-end gap-[6px]" style={{ height: 44 }}>
        {TIER_CHIPS.map(({ label, bg, text, delay }) => (
          <div
            key={label}
            className="w-9 rounded-[6px] flex items-center justify-center"
            style={{
              backgroundColor: bg,
              height: reducedMotion ? 36 : 26,
              animation: reducedMotion
                ? undefined
                : `rk-tier-chip-bounce 1.1s ease-in-out infinite`,
              animationDelay: reducedMotion ? undefined : `${delay}s`,
            }}
          >
            <span
              className="text-[13px] font-[600] select-none leading-none"
              style={{ color: text }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Caption */}
      <p className="text-[14px] text-rk-secondary text-center">
        {S.submissionLoader.shuffleCaption}
      </p>
    </div>
  );
}

export function SubmissionLoader() {
  // Chosen once on mount, never re-randomized
  const variant = useRef<"narrator" | "shuffle">(
    Math.random() < NARRATOR_WEIGHT ? "narrator" : "shuffle"
  ).current;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-rk-page">
      {variant === "narrator" ? <NarratorLoader /> : <TierShuffleLoader />}
    </div>
  );
}
