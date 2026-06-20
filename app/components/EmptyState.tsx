import React from "react";

interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  heading: string;
  subhead?: string;
  ctaLabel?: string;
  ctaAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  heading,
  subhead,
  ctaLabel,
  ctaAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div
        className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: "rgba(74,138,232,0.08)",
          border: "1px solid rgba(74,138,232,0.18)",
        }}
      >
        <Icon size={20} className="text-rk-accent" />
      </div>
      <div className="flex flex-col gap-1.5 max-w-[300px]">
        <p className="text-[15px] font-[500] text-rk-primary leading-snug">
          {heading}
        </p>
        {subhead && (
          <p className="text-[13px] text-rk-muted italic leading-snug">
            {subhead}
          </p>
        )}
      </div>
      {ctaLabel && ctaAction && (
        <button
          onClick={ctaAction}
          className="px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
