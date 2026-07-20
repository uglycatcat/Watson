import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, side = "left", title, children }: DrawerProps) {
  const [mounted, setMounted] = useState(open);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
    } else if (mounted) {
      setExiting(true);
      const t = window.setTimeout(() => {
        setMounted(false);
        setExiting(false);
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  if (!mounted) return null;

  const position = side === "left" ? "left-0" : "right-0";
  const slideFrom = side === "left" ? "translateX(-100%)" : "translateX(100%)";

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div
        className={`absolute inset-0 bg-black/40 ${exiting ? "modal-backdrop-exit" : "modal-backdrop-enter"}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`absolute top-0 ${position} h-full w-full max-w-sm flex flex-col transition-interactive ${!exiting ? (side === "left" ? "drawer-enter-left" : "drawer-enter-right") : ""}`}
        style={{
          background: "var(--panel)",
          borderColor: "var(--border)",
          borderLeft: side === "right" ? "1px solid var(--border)" : undefined,
          borderRight: side === "left" ? "1px solid var(--border)" : undefined,
          boxShadow: "var(--shadow-lg)",
          color: "var(--fg)",
          transform: exiting ? slideFrom : "translateX(0)",
          transitionDuration: "var(--duration-normal)",
        }}
      >
        <div
          className="flex items-center justify-between p-4 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          {title && <h2 className="font-semibold">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="transition-interactive text-sm px-2 py-1 rounded-md border ml-auto"
            style={{ borderColor: "var(--border)" }}
          >
            关闭
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
