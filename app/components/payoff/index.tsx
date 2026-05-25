"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { X, Flame, Sparkles, Check, Trophy, ArrowRight, Zap } from "lucide-react";
import { IconCoffee, IconSwords } from "@tabler/icons-react";
import { track } from "@vercel/analytics";
import ShareCardModal from "@/app/components/shareCard/ShareCardModal";
import Skeleton from "@/app/components/Skeleton";
import { PayoffData } from "@/lib/api/listsApi";
import { S } from "@/app/content/strings";
import { KOFI_URL } from "@/app/siteConfig";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { useReducedMotion } from "@/lib/useReducedMotion";

// ── Confetti ──────────────────────────────────────────────────────────────────

const TIER_COLORS = [
  "#C44545",
  "#E08C2C",
  "#97C459",
  "#5DCAA5",
  "#85B7EB",
  "#AFA9EC",
];

const CONFETTI_PARTICLES: {
  left: number;
  top: number;
  delay: number;
  color: string;
  rot: number;
  w: number;
  h: number;
}[] = [
  { left: 8, top: 0, delay: 0, color: TIER_COLORS[0], rot: 320, w: 8, h: 11 },
  { left: 18, top: 12, delay: 60, color: TIER_COLORS[1], rot: -270, w: 7, h: 9 },
  { left: 30, top: 4, delay: 120, color: TIER_COLORS[2], rot: 400, w: 9, h: 7 },
  { left: 42, top: 16, delay: 40, color: TIER_COLORS[3], rot: -350, w: 7, h: 10 },
  { left: 55, top: 6, delay: 200, color: TIER_COLORS[4], rot: 290, w: 8, h: 8 },
  { left: 67, top: 14, delay: 80, color: TIER_COLORS[5], rot: -420, w: 9, h: 7 },
  { left: 78, top: 2, delay: 160, color: TIER_COLORS[0], rot: 380, w: 7, h: 11 },
  { left: 90, top: 18, delay: 240, color: TIER_COLORS[1], rot: -310, w: 8, h: 9 },
  { left: 13, top: 26, delay: 300, color: TIER_COLORS[2], rot: 430, w: 9, h: 7 },
  { left: 25, top: 30, delay: 140, color: TIER_COLORS[3], rot: -280, w: 7, h: 10 },
  { left: 48, top: 22, delay: 350, color: TIER_COLORS[4], rot: 360, w: 8, h: 8 },
  { left: 62, top: 28, delay: 100, color: TIER_COLORS[5], rot: -340, w: 9, h: 7 },
  { left: 73, top: 20, delay: 220, color: TIER_COLORS[0], rot: 410, w: 7, h: 11 },
  { left: 85, top: 8, delay: 380, color: TIER_COLORS[1], rot: -300, w: 8, h: 9 },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PayoffPageProps {
  data: PayoffData | undefined;
  isLoading: boolean;
  isError: boolean;
  isFirst: boolean;
  isAnon: boolean;
  backHref: string;
  listId?: number;
  shareToken?: string;
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function PayoffNav({ backHref }: { backHref: string }) {
  return (
    <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
      <div className="flex justify-between items-center h-12">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
          <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
            tierstack.dev
          </span>
        </div>
        <Link
          href={backHref}
          aria-label="Back to list"
          className="w-8 h-8 flex items-center justify-center rounded-[8px] text-rk-muted hover:text-rk-primary hover:bg-rk-surface transition-colors"
        >
          <X size={16} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function PayoffSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 pt-6 pb-4">
        <Skeleton width={120} height={11} />
        <Skeleton width="50%" height={32} />
        <Skeleton width="70%" height={13} />
        <div className="mt-2 flex flex-col items-center gap-1">
          <Skeleton width={96} height={64} />
          <Skeleton width={160} height={11} />
        </div>
      </div>
      {/* Featured cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-[12px] border border-rk-stroke bg-rk-surface p-4 flex flex-col gap-3">
          <Skeleton width={100} height={10} />
          <Skeleton width="80%" height={20} />
          <Skeleton width="60%" height={11} />
        </div>
        <div className="rounded-[12px] border border-rk-stroke bg-rk-surface p-4 flex flex-col gap-3">
          <Skeleton width={100} height={10} />
          <Skeleton width="80%" height={20} />
          <Skeleton width="60%" height={11} />
        </div>
      </div>
      {/* Extras */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[12px] border border-rk-stroke bg-rk-surface p-4 flex flex-col items-center gap-2"
          >
            <Skeleton width={28} height={28} circle />
            <Skeleton width={40} height={22} />
            <Skeleton width={64} height={10} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function PayoffHero({
  data,
  title,
  displayPct,
  showConfetti,
}: {
  data: PayoffData | undefined;
  title: string;
  displayPct: number;
  showConfetti: boolean;
}) {
  if (!data) return null;

  const { completion, alignment } = data;

  const subtitle = completion.isComplete
    ? S.payoff.subtitleComplete(completion.rankedCount, completion.totalCount)
    : S.payoff.subtitlePartial(completion.rankedCount, completion.totalCount);

  const otherCount = Math.max(0, alignment.rankerCount - 1);
  const isFirstRanker = otherCount === 0;
  const isFewRankers = otherCount >= 1 && otherCount < 4;

  return (
    <div className="relative overflow-hidden pt-6 pb-2 flex flex-col items-center text-center gap-3">
      {/* Confetti — fires after reveal when isFirst + isComplete */}
      {showConfetti &&
        CONFETTI_PARTICLES.map((p, i) => (
          <span
            key={i}
            className="rk-confetti absolute rounded-[2px]"
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.w,
                height: p.h,
                backgroundColor: p.color,
                animationDelay: `${p.delay}ms`,
                "--rot": `${p.rot}deg`,
              } as React.CSSProperties
            }
          />
        ))}

      {/* Eyebrow */}
      <p className="relative z-10 text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest">
        {S.payoff.eyebrow}
      </p>

      {/* Title */}
      <p
        className="relative z-10 text-rk-primary font-[600] leading-none"
        style={{ fontSize: 48, letterSpacing: "-1.5px" }}
      >
        {title}
      </p>

      {/* Subtitle */}
      <p className="relative z-10 text-[13px] text-rk-muted leading-snug max-w-[280px]">
        {subtitle}
      </p>

      {/* Alignment stat */}
      {isFirstRanker ? (
        <p className="relative z-10 mt-3 text-[13px] text-rk-secondary italic leading-snug max-w-[240px]">
          {S.payoff.alignedFirst}
        </p>
      ) : (
        <div className="relative z-10 mt-3 flex flex-col items-center gap-1">
          <div className="flex items-end gap-[2px] leading-none">
            <span
              className="font-[700] text-rk-accent leading-none tabular-nums"
              style={{ fontSize: 72 }}
            >
              {displayPct}
            </span>
            <span
              className="font-[600] text-rk-accent"
              style={{ fontSize: 30, paddingBottom: 6 }}
            >
              %
            </span>
          </div>
          <p className="text-[12px] text-rk-muted">
            {isFewRankers
              ? S.payoff.alignedFew(otherCount)
              : S.payoff.alignedWith(otherCount)}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Tier badge ────────────────────────────────────────────────────────────────

const TIER_STYLE: Record<string, { bg: string; text: string }> = {
  S: { bg: "#C44545", text: "#ffffff" },
  A: { bg: "#E08C2C", text: "#2A1A04" },
  B: { bg: "#97C459", text: "#173404" },
  C: { bg: "#5DCAA5", text: "#04342C" },
  D: { bg: "#85B7EB", text: "#042C53" },
  F: { bg: "#AFA9EC", text: "#26215C" },
};

const TIER_ORDER = ["S", "A", "B", "C", "D", "F"];

function TierBadge({ tier }: { tier: string }) {
  const s = TIER_STYLE[tier] ?? { bg: "#334155", text: "#ffffff" };
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] text-[15px] font-[600] select-none flex-shrink-0"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {tier}
    </span>
  );
}

// ── Hottest take card ─────────────────────────────────────────────────────────

function HottestTakeCard({
  take,
}: {
  take: NonNullable<PayoffData["hottestTake"]>;
}) {
  const yourIdx = TIER_ORDER.indexOf(take.yourTier);
  const crowdIdx = TIER_ORDER.indexOf(take.crowdMeanTier);
  const dir: "above" | "below" = yourIdx < crowdIdx ? "above" : "below";

  return (
    <div className="rounded-[12px] border border-rk-stroke bg-rk-surface p-4 flex flex-col gap-3 justify-center items-center">
      <div className="flex items-center gap-1.5">
        <Flame size={12} className="text-rk-accent" />
        <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest">
          {S.payoff.hottestTakeEyebrow}
        </p>
      </div>

      <p className="text-rk-primary font-[600] text-[18px] leading-snug">
        {take.itemName}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-rk-muted">you</span>
          <TierBadge tier={take.yourTier} />
        </div>
        <span className="text-rk-tertiary text-[13px]">·</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-rk-muted">crowd</span>
          <TierBadge tier={take.crowdMeanTier} />
        </div>
        <span
          className="text-[11px] font-[500] px-2 py-[3px] rounded-full"
          style={{ backgroundColor: "rgba(224,92,92,0.12)", color: "#E05C5C" }}
        >
          {take.delta} tiers apart
        </span>
      </div>

      <p className="text-[12px] text-rk-muted leading-snug">
        {S.payoff.hottestTakeSupportLine(
          take.crowdMeanTier,
          take.pctOfRankersDisagree,
          dir
        )}
      </p>
    </div>
  );
}

// ── Closest match card ────────────────────────────────────────────────────────

function ClosestMatchCard({
  match,
  isFew,
}: {
  match: NonNullable<PayoffData["closestMatch"]>;
  isFew: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-rk-stroke bg-rk-surface p-4 flex flex-col gap-3 justify-center items-center">
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} className="text-rk-accent" />
        <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest">
          {S.payoff.closestMatchEyebrow}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Me */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-[600] text-white flex-shrink-0"
          style={{ backgroundColor: "#4A8AE8" }}
        >
          me
        </div>

        <ArrowRight size={13} className="text-rk-tertiary flex-shrink-0" />

        {/* Them */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-[600] text-white flex-shrink-0"
          style={{ backgroundColor: match.avatarColor }}
        >
          {(match.handle[0] ?? "?").toUpperCase()}
        </div>

        <div className="flex flex-col leading-none gap-1">
          <span
            className="font-[700] text-rk-primary tabular-nums leading-none"
            style={{ fontSize: 26 }}
          >
            {match.alignmentPct}%
          </span>
          <span className="text-[11px] text-rk-muted">aligned</span>
        </div>
      </div>

      <p className="text-[12px] text-rk-muted leading-snug">
        {isFew
          ? S.payoff.closestMatchFew
          : S.payoff.closestMatchDetail(
              match.handle,
              match.agreedCount,
              match.totalCount
            )}
      </p>
    </div>
  );
}

// ── Taste nemesis card ────────────────────────────────────────────────────────

function TasteNemesisCard({
  nemesis,
}: {
  nemesis: NonNullable<PayoffData["tasteNemesis"]>;
}) {
  return (
    <div
      className="rounded-[12px] border bg-rk-surface p-4 flex flex-col gap-3 justify-center items-center"
      style={{ borderColor: "rgba(240,149,149,0.25)" }}
    >
      <div className="flex items-center gap-1.5">
        <IconSwords size={12} style={{ color: "#F09595" }} strokeWidth={1.75} />
        <p
          className="text-[11px] font-[500] uppercase tracking-widest"
          style={{ color: "#F09595" }}
        >
          {S.nemesis.eyebrow}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Me */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-[600] text-white flex-shrink-0"
          style={{ backgroundColor: "#4A8AE8" }}
        >
          me
        </div>

        <Zap size={13} style={{ color: "#F09595" }} className="flex-shrink-0" />

        {/* Nemesis */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-[600] text-white flex-shrink-0"
          style={{ backgroundColor: nemesis.avatarColor }}
        >
          {(nemesis.handle[0] ?? "?").toUpperCase()}
        </div>

        <div className="flex flex-col leading-none gap-1">
          <span
            className="font-[700] tabular-nums leading-none"
            style={{ fontSize: 26, color: "#F09595" }}
          >
            {nemesis.alignmentPct}%
          </span>
          <span className="text-[11px] text-rk-muted">aligned</span>
        </div>
      </div>

      <p className="text-[12px] text-rk-muted leading-snug">
        {S.nemesis.detail(
          nemesis.handle,
          nemesis.disagreedCount,
          nemesis.totalCount
        )}
      </p>
    </div>
  );
}

// ── Featured (closest match + nemesis, staggered) ────────────────────────────

function PayoffFeatured({ data }: { data: PayoffData | undefined }) {
  if (!data) return null;
  const { closestMatch, tasteNemesis, alignment } = data;
  if (!closestMatch && !tasteNemesis) return null;

  const isFewRankers = alignment.rankerCount - 1 < 4;
  const cardCount = [closestMatch, tasteNemesis].filter(Boolean).length;

  return (
    <div
      className={`grid gap-3 ${
        cardCount === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
      }`}
    >
      {closestMatch && (
        <div className="rk-reveal-up" style={{ animationDelay: "0ms" }}>
          <ClosestMatchCard match={closestMatch} isFew={isFewRankers} />
        </div>
      )}
      {tasteNemesis && (
        <div className="rk-reveal-up" style={{ animationDelay: "60ms" }}>
          <TasteNemesisCard nemesis={tasteNemesis} />
        </div>
      )}
    </div>
  );
}

// ── Extras row ────────────────────────────────────────────────────────────────

function PayoffExtras({ extras }: { extras: PayoffData["extras"] }) {
  const tiles = [
    {
      icon: <Flame size={16} className="text-rk-accent" />,
      value: extras.contrarianPicks,
      label: S.payoff.contrarianLabel,
      delay: 160,
    },
    {
      icon: <Check size={16} className="text-rk-accent" />,
      value: extras.perfectMatchCount,
      label: S.payoff.perfectMatchLabel,
      delay: 220,
    },
    {
      icon: <Trophy size={16} className="text-rk-accent" />,
      value: extras.sTierCount,
      label: S.payoff.sTierLabel,
      delay: 280,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map(({ icon, value, label, delay }) => (
        <div
          key={label}
          className="rk-reveal-up"
          style={{ animationDelay: `${delay}ms` }}
        >
          <div className="rounded-[12px] border border-rk-stroke bg-rk-surface p-4 flex flex-col items-center gap-2 text-center">
            <div
              className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: "rgba(74,138,232,0.08)",
                border: "1px solid rgba(74,138,232,0.16)",
              }}
            >
              {icon}
            </div>
            <p
              className="font-[600] text-rk-primary leading-none tabular-nums"
              style={{ fontSize: 26 }}
            >
              {value}
            </p>
            <p className="text-[11px] text-rk-muted leading-tight">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CTAs ──────────────────────────────────────────────────────────────────────

function PayoffCtas({
  data,
  isFirst,
  isComplete,
  backHref,
}: PayoffPageProps & { isComplete: boolean }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [nemesisShareOpen, setNemesisShareOpen] = useState(false);

  if (!data) return null;

  const shareToken = data.shareToken;
  const rankHref = `${backHref}/s`;
  const shareLabel =
    isFirst && isComplete ? S.payoff.ctaShareFirst : S.payoff.ctaShare;

  return (
    <>
      <div className="flex flex-col gap-3">
        {shareToken && (
          <button
            onClick={() => setShareOpen(true)}
            className="w-full py-2.5 rounded-[10px] text-[14px] font-[500] bg-rk-accent text-white hover:opacity-90 transition-opacity cursor-pointer"
          >
            {shareLabel}
          </button>
        )}

        {shareToken && data.tasteNemesis && (
          <button
            onClick={() => setNemesisShareOpen(true)}
            className="w-full py-2.5 rounded-[10px] text-[14px] font-[500] border hover:opacity-90 transition-opacity cursor-pointer"
            style={{
              borderColor: "rgba(240,149,149,0.35)",
              color: "#F09595",
              backgroundColor: "rgba(240,149,149,0.06)",
            }}
          >
            {S.nemesis.shareLabel}
          </button>
        )}

        <Link
          href={backHref}
          className="block w-full py-2.5 rounded-[10px] text-[14px] font-[500] border border-rk-stroke text-rk-secondary text-center hover:border-rk-secondary hover:text-rk-primary transition-colors"
        >
          {S.payoff.ctaCompare}
        </Link>

        {!isComplete && (
          <Link
            href={rankHref}
            className="block w-full py-2.5 rounded-[10px] text-[14px] font-[500] text-rk-muted text-center hover:text-rk-secondary transition-colors"
          >
            {S.payoff.ctaFinish} →
          </Link>
        )}
      </div>

      {shareToken && (
        <ShareCardModal
          token={shareToken}
          template="hot-takes"
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
      {shareToken && data.tasteNemesis && (
        <ShareCardModal
          token={shareToken}
          template="taste-nemesis"
          open={nemesisShareOpen}
          onClose={() => setNemesisShareOpen(false)}
        />
      )}
    </>
  );
}

// ── Anon nudge ────────────────────────────────────────────────────────────────

function PayoffAnonNudge() {
  const dispatch = useAppDispatch();
  return (
    <div className="flex justify-center">
      <button
        onClick={() => dispatch(uiActions.openAuthModal())}
        className="text-[12px] text-rk-muted hover:text-rk-secondary transition-colors italic"
      >
        {S.payoff.ctaSignup}
      </button>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function PayoffFoot() {
  return (
    <div className="flex justify-center pt-2 pb-8">
      <Link
        href="/feed"
        className="text-[12px] text-rk-tertiary hover:text-rk-muted transition-colors"
      >
        {S.payoff.browseLists}
      </Link>
    </div>
  );
}

// ── Support card ──────────────────────────────────────────────────────────────

function SupportCard() {
  const [visible, setVisible] = useState(true);

  if (!visible || !KOFI_URL) return null;

  const handleDismiss = () => setVisible(false);
  const handleClick = () => track("support_cta_click");

  return (
    <div
      className="rounded-[12px] border p-4 flex items-start gap-3"
      style={{
        backgroundColor: "rgba(239,159,39,0.06)",
        borderColor: "rgba(239,159,39,0.2)",
      }}
    >
      <div
        className="flex-shrink-0 w-9 h-9 rounded-[8px] flex items-center justify-center"
        style={{
          backgroundColor: "rgba(239,159,39,0.12)",
          border: "1px solid rgba(239,159,39,0.22)",
        }}
      >
        <IconCoffee size={18} style={{ color: "#EF9F27" }} strokeWidth={1.75} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-[600] text-rk-primary leading-snug">
          {S.support.cardHeading}
        </p>
        <p className="text-[11px] text-rk-muted mt-0.5 leading-snug">
          {S.support.cardBody}
        </p>
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-[500] transition-opacity hover:opacity-80"
          style={{
            border: "1px solid rgba(239,159,39,0.4)",
            color: "#EF9F27",
          }}
        >
          <IconCoffee size={13} strokeWidth={2} />
          {S.support.cardCta}
        </a>
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-[5px] text-rk-muted hover:text-rk-secondary hover:bg-rk-surface transition-colors"
      >
        <X size={12} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PayoffPage(props: PayoffPageProps) {
  const { data, isLoading, isError, backHref, isFirst, isAnon } = props;
  const reduced = useReducedMotion();

  // ── Reveal state machine ────────────────────────────────────────────────────
  const rafRef = useRef<number | null>(null);
  const targetPctRef = useRef(0);
  // Updated on every render so RAF callback always sees fresh values
  const doRevealRef = useRef<(instant: boolean) => void>(() => {});

  const [displayPct, setDisplayPct] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  doRevealRef.current = (instant: boolean) => {
    const confetti = isFirst && (data?.completion.isComplete ?? false);
    setRevealed(true);
    if (confetti) setTimeout(() => setShowConfetti(true), instant ? 0 : 700);
  };

  useEffect(() => {
    if (!data) return;

    const otherCount = Math.max(0, data.alignment.rankerCount - 1);
    const isFirstRanker = otherCount === 0;
    const target = data.alignment.pct;
    targetPctRef.current = target;

    if (reduced || isFirstRanker) {
      setDisplayPct(target);
      doRevealRef.current(true);
      return;
    }

    const start = performance.now();
    const DURATION = 1200;

    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPct(Math.round(eased * target));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        doRevealRef.current(false);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [data, reduced]);

  const skip = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setDisplayPct(targetPctRef.current);
    doRevealRef.current(true);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isComplete = data?.completion.isComplete ?? false;
  const title = isFirst
    ? isComplete
      ? S.payoff.titleFirstComplete
      : S.payoff.titleFirstPartial
    : isComplete
    ? S.payoff.titleResubmitComplete
    : S.payoff.titleResubmitPartial;

  if (isError) {
    return (
      <div className="fixed inset-0 z-10 bg-rk-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <p className="text-rk-primary text-[17px] font-[500]">
            {S.payoff.noRankingFound}
          </p>
          <Link
            href={backHref}
            className="mt-2 px-4 py-2 text-[13px] font-[500] border border-rk-stroke text-rk-secondary rounded-[8px] hover:text-rk-primary transition-colors"
          >
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-10 bg-rk-page overflow-y-auto sm:pb-24">
      <PayoffNav backHref={backHref} />

      {/* Click-to-skip zone: only active before reveal, excluded from nav */}
      <div
        className={`px-4 sm:px-8 py-8 max-w-2xl mx-auto flex flex-col gap-8 ${
          !revealed && !isLoading ? "cursor-pointer select-none" : ""
        }`}
        onClick={!revealed && !isLoading ? skip : undefined}
      >
        {isLoading ? (
          <PayoffSkeleton />
        ) : (
          <>
            <PayoffHero
              data={data}
              title={title}
              displayPct={displayPct}
              showConfetti={showConfetti}
            />

            {data && revealed && (
              <>
                <PayoffFeatured data={data} />

                <PayoffExtras extras={data.extras} />

                {/* Hottest take — punchline, revealed last */}
                {data.hottestTake && (
                  <div
                    className="rk-reveal-pop"
                    style={{ animationDelay: "400ms" }}
                  >
                    <HottestTakeCard take={data.hottestTake} />
                  </div>
                )}

                <div className="rk-reveal-up" style={{ animationDelay: "520ms" }}>
                  <PayoffCtas {...props} isComplete={isComplete} />
                </div>

                <SupportCard />
                {isAnon && <PayoffAnonNudge />}
                {!isAnon && <PayoffFoot />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
