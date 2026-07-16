import { createPortal } from "react-dom";

export interface ToastItem {
  id: number;
  message: string;
}

interface ToastProps {
  toast: ToastItem | null;
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  return createPortal(
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 text-sm text-white pointer-events-none transition-interactive"
      style={{
        background: "var(--fg-strong)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-md)",
        animation: "toast-in var(--duration-normal) var(--ease-standard)",
      }}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>,
    document.body,
  );
}
