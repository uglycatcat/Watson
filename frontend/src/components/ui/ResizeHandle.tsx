interface ResizeHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
}

export function ResizeHandle({ onPointerDown }: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      className="w-1 shrink-0 cursor-col-resize hover:bg-[var(--accent)]/30 active:bg-[var(--accent)]/50 transition-colors"
      style={{ background: "var(--border)" }}
    />
  );
}
