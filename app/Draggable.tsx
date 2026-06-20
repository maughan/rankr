"use client";

import React, { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";

const DOUBLE_TAP_DELAY = 300;

export default function Draggable({ id, children, url }: { id: number; children: React.ReactNode; url?: string }) {
  const dispatch = useAppDispatch();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const dragging = !!transform;
  const canAnimate =
    dragging &&
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)${
          canAnimate ? " scale(1.05) rotate(1.5deg)" : ""
        }`,
        touchAction: "none",
        zIndex: 50,
        position: "relative" as const,
      }
    : { touchAction: "none" };

  const lastTap = useRef(0);

  const handlePointerUp = () => {
    if (!url) return;
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      lastTap.current = 0;
      navigator.vibrate?.(20);
      dispatch(uiActions.openImageModal(url));
    } else {
      lastTap.current = now;
    }
  };

  return (
    <div onPointerUp={handlePointerUp} style={{ display: "inline-block" }}>
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {children}
      </div>
    </div>
  );
}
