import React from "react";
import { useDroppable } from "@dnd-kit/core";

export default function Droppable({
  id,
  children,
  className,
  style: styleProp,
}: {
  id: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styleProp,
        outline: isOver ? "1px solid #4A8AE8" : undefined,
      }}
      className={className ?? "min-h-16 w-full flex flex-wrap"}
    >
      {children}
    </div>
  );
}
