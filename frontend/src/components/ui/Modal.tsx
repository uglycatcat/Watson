import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = "max-w-lg" }: ModalProps) {
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 console-modal-backdrop ${exiting ? "modal-backdrop-exit" : "modal-backdrop-enter"}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`console-modal relative w-full max-h-[90vh] overflow-auto ${exiting ? "modal-panel-exit" : "modal-panel-enter"} ${className}`}
        style={{ color: "var(--fg)" }}
      >
        <span className="console-modal__scan" aria-hidden />
        <span className="console-modal__corners" aria-hidden />
        {title && (
          <header className="console-modal__head">
            <span className="console-modal__eyebrow">MISSION RECORD</span>
            <h2 className="console-modal__title">{title}</h2>
          </header>
        )}
        <div className="console-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
