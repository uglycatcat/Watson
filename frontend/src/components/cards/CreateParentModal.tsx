import { useEffect, useMemo, useState } from "react";
import { envelopeFromCards, type ScheduleCard } from "../../lib/api";
import { useCardMutations } from "../../hooks/useCardMutations";
import { Modal } from "../ui/Modal";
import { isoToLocalInput, localInputToIso } from "./CardFormFields";

interface CreateParentModalProps {
  open: boolean;
  cards: ScheduleCard[] | null;
  knownTitles?: string[];
  onClose: () => void;
  onSuccess?: (parent: ScheduleCard, sourceIds: string[]) => void;
}

function isDuplicateTitle(title: string, knownTitles: string[]): boolean {
  const norm = title.trim().toLowerCase();
  if (!norm) return false;
  return knownTitles.some((t) => t.trim().toLowerCase() === norm);
}

function isNarrowerThanEnvelope(
  startAt: string | null,
  endAt: string | null,
  envelope: { startAt: string | null; endAt: string | null },
): boolean {
  if (envelope.startAt == null && envelope.endAt == null) return false;
  if (startAt == null || endAt == null) return true;
  if (envelope.startAt == null || envelope.endAt == null) return false;
  return new Date(startAt) > new Date(envelope.startAt) || new Date(endAt) < new Date(envelope.endAt);
}

export function CreateParentModal({ open, cards, knownTitles = [], onClose, onSuccess }: CreateParentModalProps) {
  const { composeParent, isComposing } = useCardMutations();
  const envelope = useMemo(() => (cards ? envelopeFromCards(cards) : { startAt: null, endAt: null }), [cards]);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (open && cards) {
      setTitle("");
      setStartAt(isoToLocalInput(envelope.startAt));
      setEndAt(isoToLocalInput(envelope.endAt));
      setErrors([]);
    }
  }, [open, cards, envelope.startAt, envelope.endAt]);

  const validate = (): string[] => {
    const next: string[] = [];
    if (!title.trim()) next.push("请填写父卡片名称");
    else if (isDuplicateTitle(title, knownTitles)) next.push("标题已存在，请使用其他标题");
    if (startAt && !endAt) next.push("已安排时间必须填写结束时间");
    if (startAt && endAt) {
      const s = localInputToIso(startAt);
      const e = localInputToIso(endAt);
      if (s && e && new Date(e) < new Date(s)) next.push("结束时间不能早于开始时间");
      if (s && e && isNarrowerThanEnvelope(s, e, envelope)) {
        next.push("父卡片时间不能窄于子卡片包络");
      }
    }
    return next;
  };

  const handleConfirm = async () => {
    if (!cards || cards.length !== 2) return;
    const v = validate();
    if (v.length) {
      setErrors(v);
      return;
    }
    setErrors([]);
    try {
      const parent = await composeParent({
        cardIds: [cards[0].id, cards[1].id],
        title: title.trim(),
        startAt: startAt ? localInputToIso(startAt) : null,
        endAt: endAt ? localInputToIso(endAt) : null,
      });
      onSuccess?.(parent, [cards[0].id, cards[1].id]);
      onClose();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "组合失败"]);
    }
  };

  if (!cards) return null;

  const inputClass = "w-full px-2 py-1.5 rounded-md border text-sm transition-interactive";
  const inputStyle = { borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" };
  const actionBtnClass = "text-sm px-3 py-1.5 border transition-interactive shell-btn";
  const actionBtnStyle = {
    borderColor: "var(--border)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg)",
    color: "var(--fg)",
  } as const;

  return (
    <Modal open={open} onClose={onClose} title="组合为父卡片" className="max-w-md">
      {errors.length ? (
        <ul className="text-red-600 text-xs space-y-1 mb-3">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      <label className="block text-sm mb-3">
        <span style={{ color: "var(--muted)" }}>名称 *</span>
        <input
          className={inputClass}
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setErrors(validate())}
          autoFocus
        />
      </label>
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
        <label className="block">
          <span style={{ color: "var(--muted)" }}>开始时间</span>
          <input
            type="datetime-local"
            className={inputClass}
            style={inputStyle}
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </label>
        <label className="block">
          <span style={{ color: "var(--muted)" }}>结束时间</span>
          <input
            type="datetime-local"
            className={inputClass}
            style={inputStyle}
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </label>
      </fieldset>
      <div className="text-sm mb-4">
        <span style={{ color: "var(--muted)" }}>待纳入</span>
        <ul className="mt-1 space-y-1">
          {cards.map((c) => (
            <li key={c.id} className="px-2 py-1 rounded-md border" style={{ borderColor: "var(--border)" }}>
              {c.title}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={actionBtnClass} style={actionBtnStyle}>
          取消
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isComposing}
          className={`${actionBtnClass} btn-accent text-white disabled:opacity-40`}
          style={{ ...actionBtnStyle, background: "var(--accent)", borderColor: "var(--accent)" }}
        >
          {isComposing ? "组合中…" : "确认"}
        </button>
      </div>
    </Modal>
  );
}
