import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-6 px-3" : "py-12 px-4"}`}
    >
      {icon && (
        <div
          className={`empty-state-icon mb-3 flex items-center justify-center rounded-full ${compact ? "text-2xl w-10 h-10" : "text-3xl w-12 h-12"}`}
          style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
        >
          {icon}
        </div>
      )}
      <h3
        className={`empty-state-title ${compact ? "text-sm font-medium mb-1" : "text-base font-semibold mb-2"}`}
        style={{ color: "var(--fg)" }}
      >
        {title}
      </h3>
      {description && (
        <p className={`font-body max-w-sm ${compact ? "text-xs mb-2" : "text-sm mb-4"}`} style={{ color: "var(--muted)" }}>
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="transition-interactive text-sm px-4 py-2 rounded-md text-white font-body"
          style={{ background: "var(--accent)" }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
