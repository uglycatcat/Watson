import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api, type ScheduleCard } from "../../lib/api";
import { useCardMutations } from "../../hooks/useCardMutations";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import {
  CardFormFields,
  cardToFormValues,
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

function levelLabel(l: string) {
  if (l === "high") return "高";
  if (l === "low") return "低";
  return "中";
}

export function CardDetailModal({ card, onClose, onUpdated }: CardDetailModalProps) {
  const { deleteCard, updateCard, isDeleting, isUpdating } = useCardMutations();
  const { data: catData } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });
  const categories = catData?.items ?? [];

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [values, setValues] = useState<CardFormValues | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode("view");
    setErrors([]);
    setConfirmOpen(false);
    setDeleteErrorMsg(null);
    if (card && categories.length) {
      setValues(cardToFormValues(card, categories));
    } else {
      setValues(null);
    }
  }, [card?.id, categories.length]);

  const handleClose = () => {
    setMode("view");
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
    if (!values) return;
    const v = validateCardForm(values);
    if (v.length) {
      setErrors(v);
      return;
    }
    setErrors([]);
    try {
      const updated = await updateCard({ id: card.id, body: formValuesToInput(values) });
      onUpdated?.(updated);
      setMode("view");
    } catch (err) {
      if (isTitleConflictError(err)) {
        setErrors(["标题已存在，请使用其他标题"]);
      } else {
        setErrors([err instanceof Error ? err.message : "保存失败"]);
      }
    }
  };

  return (
    <>
      <Modal open={!!card} onClose={handleClose} title={mode === "edit" ? "编辑日程" : card.title}>
        {mode === "edit" && values ? (
          <CardFormFields
            values={values}
            onChange={(patch) => setValues((prev) => (prev ? { ...prev, ...patch } : prev))}
            categories={categories}
            errors={errors}
          />
        ) : (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-[var(--muted)]">时间</dt>
              <dd>
                {card.timeNature == null
                  ? "无时间"
                  : card.timeNature === "duration"
                    ? `持续型 · ${formatTime(card.startAt)} – ${formatTime(card.endAt)}`
                    : `截止型 · ${formatTime(card.deadlineAt)}`}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">重要程度</dt>
              <dd>{levelLabel(card.importance)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">紧急程度</dt>
              <dd>{levelLabel(card.urgency)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">分类</dt>
              <dd>{card.categoryName}</dd>
            </div>
            {card.description && (
              <div>
                <dt className="text-[var(--muted)]">描述</dt>
                <dd className="whitespace-pre-wrap">{card.description}</dd>
              </div>
            )}
          </dl>
        )}
        <div className="mt-6 flex justify-between gap-2">
          {mode === "view" ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="text-sm px-3 py-1.5 rounded border text-red-600 border-red-300"
              >
                删除该日程
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="text-sm px-3 py-1.5 rounded border"
                  style={{ borderColor: "var(--border)" }}
                >
                  编辑
                </button>
                <button type="button" onClick={handleClose} className="text-sm px-3 py-1.5 rounded border" style={{ borderColor: "var(--border)" }}>
                  关闭
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("view");
                  setErrors([]);
                  if (categories.length) setValues(cardToFormValues(card, categories));
                }}
                className="text-sm px-3 py-1.5 rounded border"
                style={{ borderColor: "var(--border)" }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isUpdating}
                className="text-sm px-3 py-1.5 rounded text-white"
                style={{ background: "var(--accent)" }}
              >
                {isUpdating ? "保存中…" : "保存"}
              </button>
            </>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmOpen}
        title="删除确认"
        message={`确定删除「${card.title}」吗？`}
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
