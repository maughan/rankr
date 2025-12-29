"use client";

import React, { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";

const DOUBLE_TAP_DELAY = 300;

export default function Draggable({ id, children, url }: any) {
  const dispatch = useAppDispatch();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        touchAction: "none",
      }
    : { touchAction: "none" };

  const lastTap = useRef(0);

  const handleDoubleTap = () => {
    dispatch(uiActions.openImageModal(url));
  };

  const handlePointerUp = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      lastTap.current = 0;
      navigator.vibrate?.(20);
      handleDoubleTap();
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
