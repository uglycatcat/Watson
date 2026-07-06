import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, side = "left", title, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const position = side === "left" ? "left-0" : "right-0";

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside
        className={`absolute top-0 ${position} h-full w-full max-w-sm border shadow-xl flex flex-col`}
        style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--fg)" }}
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          {title && <h2 className="font-semibold">{title}</h2>}
          <button type="button" onClick={onClose} className="text-sm px-2 py-1 rounded border ml-auto" style={{ borderColor: "var(--border)" }}>
            关闭
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
