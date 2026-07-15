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
    <Modal open={open} onClose={onCancel} title={title} className={`max-w-xs ${className}`}>
      <p className="mb-4 text-sm">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded border"
          style={{ borderColor: "var(--border)" }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded text-white"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "处理中…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
