interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`rounded-md ${className}`}
      style={{
        background: "color-mix(in srgb, var(--border) 55%, var(--panel))",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
        ...style,
      }}
      aria-hidden
    />
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))" }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[88px]" />
      ))}
    </div>
  );
}

export function SkeletonWeekMonth() {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: 7 }, (_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}
