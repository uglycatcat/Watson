import { useCallback, useEffect, useState } from "react";

const CHAT_OPEN_KEY = "watson:chatOpen";
const CHAT_WIDTH_KEY = "watson:chatPanelWidth";
const DEFAULT_WIDTH = 384;
const MIN_WIDTH = 280;
const MAX_WIDTH = 560;
const MAIN_MIN_WIDTH = 320;

function clampWidth(w: number): number {
  const max = Math.min(MAX_WIDTH, Math.floor(window.innerWidth * 0.45));
  const upper = Math.max(MIN_WIDTH, max);
  const capped = Math.min(w, window.innerWidth - MAIN_MIN_WIDTH);
  return Math.max(MIN_WIDTH, Math.min(capped, upper));
}

/** Fresh load/refresh always starts closed (FR-018); width still persisted in localStorage. */
function readChatOpen(): boolean {
  try {
    sessionStorage.removeItem(CHAT_OPEN_KEY);
  } catch {
    /* ignore */
  }
  return false;
}

function readWidth(): number {
  try {
    const raw = localStorage.getItem(CHAT_WIDTH_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) return clampWidth(n);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_WIDTH;
}

export function useChatPanelLayout() {
  const [chatOpen, setChatOpenState] = useState(readChatOpen);
  const [width, setWidth] = useState(readWidth);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onResize = () => setWidth((w) => clampWidth(w));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleChat = useCallback(() => {
    setChatOpenState((v) => {
      const next = !v;
      try {
        sessionStorage.setItem(CHAT_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;
      setDragging(true);

      const onMove = (ev: PointerEvent) => {
        const delta = startX - ev.clientX;
        setWidth(clampWidth(startWidth + delta));
      };
      const onUp = () => {
        setDragging(false);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        setWidth((w) => {
          const clamped = clampWidth(w);
          try {
            localStorage.setItem(CHAT_WIDTH_KEY, String(clamped));
          } catch {
            /* ignore */
          }
          return clamped;
        });
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [width],
  );

  return { chatOpen, toggleChat, width, onResizeStart, dragging };
}
