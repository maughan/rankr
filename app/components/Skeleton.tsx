interface SkeletonProps {
  height: number | string;
  width?: number | string;
  circle?: boolean;
  className?: string;
}

export default function Skeleton({
  height,
  width = "100%",
  circle = false,
  className,
}: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        backgroundColor: "#2A3A58",
        borderRadius: circle ? "50%" : 4,
        display: "inline-block",
        flexShrink: 0,
        animation: "skeleton-pulse 1.6s ease-in-out infinite",
      }}
    />
  );
}
