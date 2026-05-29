"use client";

import { Zap, Eye, Flame } from "lucide-react";
import { nameToColor } from "@/lib/itemColor";

export interface AwardUser {
  userId: number;
  username: string;
  pct: number; // within-1-tier alignment % vs crowd average
}

export interface SpiciestPick {
  userId: number;
  username: string;
  itemName: string;
  delta: number; // tier distance from crowd avg for their hottest individual take
}

interface Props {
  contrarian: AwardUser | null;
  agreeable: AwardUser | null;
  spiciest: SpiciestPick | null;
  onSelectUser: (userId: number) => void;
}

function AvatarTile({ username }: { username: string }) {
  return (
    <div
      className="w-6 h-6 rounded-[5px] flex items-center justify-center text-[11px] font-[700] text-white flex-shrink-0"
      style={{ backgroundColor: nameToColor(username) }}
    >
      {username[0]?.toUpperCase()}
    </div>
  );
}

interface CardSpec {
  key: string;
  Icon: React.ElementType;
  eyebrow: string;
  name: string;
  caption: string;
  accentColor: string;
  accentBg: string;
  borderColor: string;
  avatarUsername: string | null;
  onClick?: () => void;
}

function AwardCard({ card }: { card: CardSpec }) {
  const { Icon, eyebrow, name, caption, accentColor, accentBg, borderColor, avatarUsername, onClick } = card;

  const inner = (
    <div
      className="rounded-[10px] border p-3 flex flex-col gap-2 h-full"
      style={{ backgroundColor: accentBg, borderColor }}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={11} style={{ color: accentColor }} />
        <span
          className="text-[10px] font-[600] uppercase tracking-widest"
          style={{ color: accentColor }}
        >
          {eyebrow}
        </span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        {avatarUsername && <AvatarTile username={avatarUsername} />}
        <span className="text-[13px] font-[600] text-rk-primary truncate">{name}</span>
      </div>
      <span className="text-[11px] text-rk-muted leading-snug">{caption}</span>
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="text-left cursor-pointer hover:opacity-80 transition-opacity"
      >
        {inner}
      </button>
    );
  }
  return <div>{inner}</div>;
}

export default function ListAwards({ contrarian, agreeable, spiciest, onSelectUser }: Props) {
  const cards: CardSpec[] = [
    ...(contrarian
      ? [
          {
            key: "contrarian",
            Icon: Zap,
            eyebrow: "Contrarian",
            name: contrarian.username,
            caption: `${100 - contrarian.pct}% against the crowd`,
            accentColor: "#EF4444",
            accentBg: "rgba(239,68,68,0.08)",
            borderColor: "rgba(239,68,68,0.18)",
            avatarUsername: contrarian.username,
            onClick: () => onSelectUser(contrarian.userId),
          },
        ]
      : []),
    ...(agreeable
      ? [
          {
            key: "agreeable",
            Icon: Eye,
            eyebrow: "Most Agreeable",
            name: agreeable.username,
            caption: `${agreeable.pct}% with the crowd`,
            accentColor: "#A78BFA",
            accentBg: "rgba(167,139,250,0.08)",
            borderColor: "rgba(167,139,250,0.18)",
            avatarUsername: agreeable.username,
            onClick: () => onSelectUser(agreeable.userId),
          },
        ]
      : []),
    ...(spiciest
      ? [
          {
            key: "spiciest",
            Icon: Flame,
            eyebrow: "Spiciest Pick",
            name: spiciest.username,
            caption: `${spiciest.itemName} · ${spiciest.delta} tier${spiciest.delta !== 1 ? "s" : ""} from consensus`,
            accentColor: "#F59E0B",
            accentBg: "rgba(245,158,11,0.08)",
            borderColor: "rgba(245,158,11,0.18)",
            avatarUsername: spiciest.username,
            onClick: () => onSelectUser(spiciest.userId),
          },
        ]
      : []),
  ];

  if (!cards.length) return null;

  const gridCols =
    cards.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : cards.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest">
        Awards
      </span>
      <div className={`grid gap-2 ${gridCols}`}>
        {cards.map((card) => (
          <AwardCard key={card.key} card={card} />
        ))}
      </div>
    </div>
  );
}
