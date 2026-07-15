import type { RefObject, KeyboardEvent } from "react";
import type { ScheduleCard } from "../../lib/api";
import { PriorityField } from "./PriorityPicker";

export interface CardFormValues {
  title: string;
  startAt: string;
  endAt: string;
  importance: number;
  urgency: number;
  categoryId: string;
  description: string;
}

interface CardFormFieldsProps {
  values: CardFormValues;
  onChange: (patch: Partial<CardFormValues>) => void;
  categories: { id: string; name: string }[];
  errors?: string[];
  readOnly?: boolean;
  titleInputRef?: RefObject<HTMLInputElement | null>;
  onTitleKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onTitleCompositionStart?: () => void;
  onTitleCompositionEnd?: () => void;
}

const inputClass = "w-full px-2 py-1.5 rounded border text-sm";
const inputStyle = { borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" };

export function CardFormFields({
  values,
  onChange,
  categories,
  errors,
  readOnly,
  titleInputRef,
  onTitleKeyDown,
  onTitleCompositionStart,
  onTitleCompositionEnd,
}: CardFormFieldsProps) {
  return (
    <div className="space-y-3 text-sm">
      {errors?.length ? (
        <ul className="text-red-600 text-xs space-y-1">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      <label className="block">
        <span className="text-[var(--muted)]">标题 *</span>
        <input
          ref={titleInputRef}
          className={inputClass}
          style={inputStyle}
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onKeyDown={onTitleKeyDown}
          onCompositionStart={onTitleCompositionStart}
          onCompositionEnd={onTitleCompositionEnd}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </label>
      <fieldset disabled={readOnly}>
        <legend className="text-[var(--muted)] mb-1">时间（可选）</legend>
        <label className="block">
          <span className="text-[var(--muted)]">开始时间</span>
          <input
            type="datetime-local"
            className={inputClass}
            style={inputStyle}
            value={values.startAt}
            onChange={(e) => onChange({ startAt: e.target.value })}
          />
        </label>
        <label className="block mt-2">
          <span className="text-[var(--muted)]">结束时间</span>
          <input
            type="datetime-local"
            className={inputClass}
            style={inputStyle}
            value={values.endAt}
            onChange={(e) => onChange({ endAt: e.target.value })}
            disabled={!values.startAt}
          />
        </label>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <PriorityField
          label="重要程度"
          value={values.importance}
          onChange={(v) => onChange({ importance: v })}
          disabled={readOnly}
        />
        <PriorityField
          label="紧急程度"
          value={values.urgency}
          onChange={(v) => onChange({ urgency: v })}
          disabled={readOnly}
        />
      </div>
      <label className="block">
        <span className="text-[var(--muted)]">分类</span>
        <select
          className={inputClass}
          style={inputStyle}
          value={values.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
          disabled={readOnly}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-[var(--muted)]">描述（可选）</span>
        <textarea
          className={inputClass}
          style={inputStyle}
          rows={2}
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </label>
    </div>
  );
}

export function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function validateCardForm(values: CardFormValues): string[] {
  const errors: string[] = [];
  if (!values.title.trim()) errors.push("请填写标题");
  if (values.endAt && !values.startAt) errors.push("填写结束时间需先有开始时间");
  if (values.startAt && values.endAt) {
    const s = localInputToIso(values.startAt);
    const e = localInputToIso(values.endAt);
    if (s && e && new Date(e) < new Date(s)) errors.push("结束时间不能早于开始时间");
  }
  return errors;
}

export function formValuesToInput(values: CardFormValues) {
  return {
    title: values.title.trim(),
    importance: values.importance,
    urgency: values.urgency,
    categoryId: values.categoryId || undefined,
    description: values.description.trim() || null,
    startAt: values.startAt ? localInputToIso(values.startAt) : null,
    endAt: values.endAt ? localInputToIso(values.endAt) : null,
  };
}

export function cardToFormValues(card: ScheduleCard, categories: { id: string; name: string }[]): CardFormValues {
  const personal = categories.find((c) => c.name === "个人") ?? categories[0];
  return {
    title: card.title,
    startAt: isoToLocalInput(card.startAt),
    endAt: isoToLocalInput(card.endAt),
    importance: card.importance,
    urgency: card.urgency,
    categoryId: card.categoryId || personal?.id || "",
    description: card.description ?? "",
  };
}

export function emptyFormValues(categories: { id: string; name: string }[]): CardFormValues {
  const personal = categories.find((c) => c.name === "个人") ?? categories[0];
  return {
    title: "",
    startAt: "",
    endAt: "",
    importance: 5,
    urgency: 5,
    categoryId: personal?.id ?? "",
    description: "",
  };
}

export function isTitleConflictError(err: unknown): boolean {
  return err instanceof Error && err.message === "Title already exists";
}

export function formatCardTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function formValuesEqual(a: CardFormValues, b: CardFormValues): boolean {
  return (
    a.title === b.title &&
    a.startAt === b.startAt &&
    a.endAt === b.endAt &&
    a.importance === b.importance &&
    a.urgency === b.urgency &&
    a.categoryId === b.categoryId &&
    a.description === b.description
  );
}
