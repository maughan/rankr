// Progress indicator for multi-step onboarding flows (1-indexed).
export default function ProgressDots({
  step,
  total = 3,
}: {
  step: number;
  total?: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i + 1 === step ? 20 : 6,
            height: 6,
            backgroundColor:
              i + 1 === step
                ? "var(--rk-accent, #4A8AE8)"
                : "rgba(255,255,255,0.12)",
          }}
        />
      ))}
    </div>
  );
}
