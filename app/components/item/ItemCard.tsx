"use client";

import { useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { ImageKitLoader } from "@/lib/helpers";
import { useOverflow } from "@/lib/useOverflow";

export interface CardItem {
  id: number;
  img?: string | null;
  name?: string | null;
  color?: string | null;
  short_label?: string | null;
}

interface Props {
  item: CardItem;
  onEdit?: () => void;
  isJustDropped?: boolean;
  variant?: "view" | "rank";
}

export function ItemCard({ item, onEdit, isJustDropped, variant = "view" }: Props) {
  const editable = !!onEdit;
  const textRef = useRef<HTMLParagraphElement>(null);
  const isOverflowing = useOverflow(textRef, item.name);

  // Long-press state (touch / pen only; desktop hover is handled by CSS)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pointerStart.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (editable || !isOverflowing || e.pointerType === "mouse") return;
      pointerStart.current = { x: e.clientX, y: e.clientY };
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        const el = textRef.current;
        if (!el) return;
        el.classList.add("mq-scroll-active");
        navigator.vibrate?.(10);
      }, 500);
    },
    [editable, isOverflowing]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStart.current) return;
      const dx = e.clientX - pointerStart.current.x;
      const dy = e.clientY - pointerStart.current.y;
      if (dx * dx + dy * dy > 25) cancelLongPress();
    },
    [cancelLongPress]
  );

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const onEnd = () => el.classList.remove("mq-scroll-active");
    el.addEventListener("animationend", onEnd);
    return () => el.removeEventListener("animationend", onEnd);
  }, []);

  let base: string;
  if (editable) {
    base =
      "mq-card w-[70px] bg-rk-surface border border-rk-stroke rounded-[8px] overflow-hidden relative cursor-pointer group";
  } else if (variant === "rank") {
    base =
      "mq-card relative w-[70px] bg-rk-surface border border-rk-stroke rounded-[8px] overflow-hidden cursor-grab active:cursor-grabbing" +
      " motion-safe:transition-[transform,border-color] motion-safe:duration-150 motion-safe:ease-out" +
      " motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.02] motion-safe:hover:border-rk-muted";
  } else {
    base =
      "mq-card w-[70px] bg-rk-surface border border-rk-stroke rounded-[8px] overflow-hidden relative" +
      " motion-safe:transition-transform motion-safe:hover:scale-[1.04] cursor-default";
  }

  const cls = `${base}${isJustDropped ? " rk-item-drop" : ""}`;

  const pointerHandlers =
    editable
      ? {}
      : {
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: cancelLongPress,
          onPointerCancel: cancelLongPress,
        };

  const textEl = (
    <div className="px-1.5 py-1.5 overflow-hidden">
      <p
        ref={textRef}
        className={`text-[11px] text-rk-secondary leading-tight whitespace-nowrap${isOverflowing ? " mq-candidate" : ""}`}
        title={item.name ?? undefined}
      >
        {item.name ?? "—"}
      </p>
    </div>
  );

  const overlay = editable ? (
    <div
      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      onClick={onEdit}
    >
      <Pencil size={14} className="text-white" />
    </div>
  ) : null;

  if (item.img) {
    return (
      <div className={cls} {...pointerHandlers}>
        <div className="relative h-[44px]">
          <Image
            loader={ImageKitLoader}
            src={item.img}
            alt=""
            fill
            sizes="70px"
            style={{ objectFit: "cover" }}
          />
        </div>
        {textEl}
        {overlay}
      </div>
    );
  }

  return (
    <div className={cls} {...pointerHandlers}>
      <div
        className="h-[44px] flex items-center justify-center rounded-t-[6px]"
        style={{ backgroundColor: item.color ?? "#334155" }}
      >
        <span className="text-white text-[11px] font-[500] select-none">
          {item.short_label}
        </span>
      </div>
      {textEl}
      {overlay}
    </div>
  );
}
