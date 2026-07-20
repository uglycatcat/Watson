import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  className?: string;
}

export function ConfirmDialog({
  open,
  title = "确认",
  message,
  confirmLabel = "确定",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
  loading,
  className = "",
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} className={`max-w-xs confirm-danger ${className}`}>
      <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
        {message}
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="transition-interactive text-sm px-3 py-1.5 rounded-md border confirm-cancel"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="transition-interactive text-sm px-3 py-1.5 rounded-md text-white confirm-danger-button"
        >
          {loading ? "处理中…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
