import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MonthlyGraiPanel, type MonthlyGraiPanelHandle } from "./MonthlyGraiPanel";

interface MonthlyGraiSheetProps {
  open: boolean;
  month: string;
  monthTitle: string;
  onClose: () => void;
}

export function MonthlyGraiSheet({ open, month, monthTitle, onClose }: MonthlyGraiSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [exiting, setExiting] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<MonthlyGraiPanelHandle>(null);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const exitMs = reduceMotion ? 80 : 200;

  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      setClosing(false);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    if (mounted) {
      setExiting(true);
      const t = window.setTimeout(() => {
        setMounted(false);
        setExiting(false);
        setClosing(false);
      }, exitMs);
      return () => window.clearTimeout(t);
    }
  }, [open, mounted, exitMs]);

  const requestClose = useCallback(async () => {
    if (closing || exiting) return;
    setClosing(true);
    try {
      await panelRef.current?.flush();
    } finally {
      onClose();
    }
  }, [closing, exiting, onClose]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, requestClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="monthly-grai-sheet-root" role="dialog" aria-modal="true" aria-label="月度 GRAI 复盘">
      <div
        className={`monthly-grai-sheet-backdrop ${exiting ? "is-exit" : "is-enter"}`}
        onClick={() => void requestClose()}
        aria-hidden
      />
      <div className={`monthly-grai-sheet ${exiting ? "is-exit" : "is-enter"}`}>
        <div className="monthly-grai-sheet__handle" aria-hidden />
        <header className="monthly-grai-sheet__header">
          <div className="monthly-grai-sheet__titles">
            <h2 className="monthly-grai-sheet__title">
              {monthTitle}
              <span className="monthly-grai-sheet__badge">GRAI 月报</span>
            </h2>
          </div>
          <button
            type="button"
            className="monthly-grai-sheet__close"
            disabled={closing}
            onClick={() => void requestClose()}
          >
            关闭
          </button>
        </header>
        <div className="monthly-grai-sheet__body">
          <MonthlyGraiPanel ref={panelRef} month={month} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
