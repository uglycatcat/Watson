import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api, isTrashed, type ScheduleCard } from "../../lib/api";
import { useCardMutations } from "../../hooks/useCardMutations";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import { CompleteCheckbox } from "./CompleteCheckbox";
import {
  CardFormFields,
  cardToFormValues,
  formatCardTimestamp,
  formValuesEqual,
  formValuesToInput,
  isTitleConflictError,
  validateCardForm,
  type CardFormValues,
} from "./CardFormFields";

interface CardDetailModalProps {
  card: ScheduleCard | null;
  onClose: () => void;
  onUpdated?: (card: ScheduleCard) => void;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "yyyy-MM-dd HH:mm");
}

export function CardDetailModal({ card, onClose, onUpdated }: CardDetailModalProps) {
  const { deleteCard, updateCard, isDeleting, isUpdating } = useCardMutations();
  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
    enabled: !!card,
  });
  const categories = catData?.items ?? [];

  const [values, setValues] = useState<CardFormValues | null>(null);
  const [snapshot, setSnapshot] = useState<CardFormValues | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const cardIdRef = useRef<string | null>(null);

  const readOnly = card ? isTrashed(card) : false;
  const dirty = values && snapshot ? !formValuesEqual(values, snapshot) : false;

  useEffect(() => {
    if (!card || !categories.length) {
      setValues(null);
      setSnapshot(null);
      cardIdRef.current = null;
      return;
    }
    const next = cardToFormValues(card, categories);
    if (cardIdRef.current !== card.id) {
      cardIdRef.current = card.id;
      setValues(next);
      setSnapshot(next);
      setErrors([]);
      setConfirmOpen(false);
      setDeleteErrorMsg(null);
    }
  }, [card?.id, card?.updatedAt, categories.length]);

  const handleClose = () => {
    setConfirmOpen(false);
    setDeleteErrorMsg(null);
    onClose();
  };

  if (!card) return null;

  const handleDelete = async () => {
    setDeleteErrorMsg(null);
    try {
      await deleteCard(card.id);
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      setDeleteErrorMsg(err instanceof Error ? err.message : "删除失败，请重试");
    }
  };

  const handleSave = async () => {
    if (!values || readOnly) return;
    if (!dirty) {
      onClose();
      return;
    }
    const v = validateCardForm(values);
    if (v.length) {
      setErrors(v);
      return;
    }
    setErrors([]);
    try {
      const updated = await updateCard({ id: card.id, body: formValuesToInput(values) });
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      if (isTitleConflictError(err)) {
        setErrors(["标题已存在，请使用其他标题"]);
      } else {
        setErrors([err instanceof Error ? err.message : "保存失败"]);
      }
    }
  };

  const handleReset = () => {
    if (snapshot) {
      setValues(snapshot);
      setErrors([]);
    }
  };

  const actionBtnClass = "text-sm px-3 py-1.5 border transition-interactive shell-btn";
  const actionBtnStyle = {
    borderColor: "var(--border)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg)",
    color: "var(--fg)",
  } as const;

  return (
    <>
      <Modal
        open={!!card}
        onClose={handleClose}
        title={card.title}
        className="max-w-md"
      >
        <div className="relative">
          {!readOnly && (
            <div className="absolute top-0 right-0 -mt-1">
              <CompleteCheckbox cardId={card.id} onComplete={onClose} />
            </div>
          )}
          {readOnly && (
            <div className="mb-3 flex gap-2 text-xs">
              {card.status === "completed" && (
                <span className="px-2 py-0.5 rounded" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                  已完成
                </span>
              )}
              {card.status === "deleted" && (
                <span className="px-2 py-0.5 rounded bg-red-600 text-white">已删除</span>
              )}
            </div>
          )}
          {values ? (
            <CardFormFields
              values={values}
              onChange={(patch) => setValues((prev) => (prev ? { ...prev, ...patch } : prev))}
              categories={categories}
              errors={errors}
              readOnly={readOnly}
            />
          ) : null}
          {readOnly && (
            <dl className="mt-2 space-y-1 text-xs" style={{ color: "var(--muted)" }}>
              <div>
                时间：{card.startAt ? `${formatTime(card.startAt)}${card.endAt ? ` – ${formatTime(card.endAt)}` : ""}` : "未安排"}
              </div>
              {card.trashedAt && <div>移入垃圾箱：{formatCardTimestamp(card.trashedAt)}</div>}
            </dl>
          )}
          <footer className="mt-4 pt-3 border-t text-[10px] space-y-0.5" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
            <div>创建时间：{formatCardTimestamp(card.createdAt)}</div>
            <div>最后修改时间：{formatCardTimestamp(card.updatedAt)}</div>
          </footer>
        </div>
        <div className="mt-4 flex justify-between gap-2">
          {!readOnly ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className={`${actionBtnClass} text-red-600`}
                style={actionBtnStyle}
              >
                删除
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!dirty}
                  className={`${actionBtnClass} disabled:opacity-40`}
                  style={actionBtnStyle}
                >
                  重置
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isUpdating}
                  className={`${actionBtnClass} btn-accent disabled:opacity-40`}
                  style={{ ...actionBtnStyle, background: "var(--accent)", borderColor: "var(--accent)", color: "var(--on-accent)" }}
                >
                  {isUpdating ? "保存中…" : "确认"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className={actionBtnClass}
                style={actionBtnStyle}
              >
                关闭
              </button>
            </div>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmOpen}
        title="删除"
        message={`确定删除「${card.title}」吗？`}
        confirmLabel="删除"
        className="max-w-xs"
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteErrorMsg(null);
        }}
        loading={isDeleting}
      />
      {deleteErrorMsg && (
        <p className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] text-sm px-4 py-2 rounded shadow text-white bg-red-600">
          {deleteErrorMsg}
        </p>
      )}
    </>
  );
}
