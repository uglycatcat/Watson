import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watson-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-watson-border bg-watson-surface p-6 shadow-2xl shadow-black/40">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="watson-modal-title" className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-watson-muted transition hover:bg-white/10 hover:text-white"
            aria-label="关闭"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
