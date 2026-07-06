import type { RefObject, KeyboardEvent } from "react";
import type { PriorityLevel, ScheduleCard, TimeNature } from "../../lib/api";

export interface CardFormValues {
  title: string;
  timeNature: TimeNature | null;
  startAt: string;
  endAt: string;
  deadlineAt: string;
  importance: PriorityLevel;
  urgency: PriorityLevel;
  categoryId: string;
  description: string;
}

interface CardFormFieldsProps {
  values: CardFormValues;
  onChange: (patch: Partial<CardFormValues>) => void;
  categories: { id: string; name: string }[];
  errors?: string[];
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
  titleInputRef,
  onTitleKeyDown,
  onTitleCompositionStart,
  onTitleCompositionEnd,
}: CardFormFieldsProps) {
  const hasTime = values.timeNature != null;

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
        />
      </label>
      <fieldset>
        <legend className="text-[var(--muted)] mb-1">时间</legend>
        <label className="mr-4">
          <input
            type="radio"
            checked={!hasTime}
            onChange={() =>
              onChange({
                timeNature: null,
                startAt: "",
                endAt: "",
                deadlineAt: "",
              })
            }
          />{" "}
          无时间
        </label>
        <label className="mr-4">
          <input
            type="radio"
            checked={values.timeNature === "duration"}
            onChange={() => onChange({ timeNature: "duration" })}
          />{" "}
          持续型
        </label>
        <label>
          <input
            type="radio"
            checked={values.timeNature === "deadline"}
            onChange={() => onChange({ timeNature: "deadline" })}
          />{" "}
          截止型
        </label>
      </fieldset>
      {values.timeNature === "duration" ? (
        <>
          <label className="block">
            <span className="text-[var(--muted)]">开始时间 *</span>
            <input
              type="datetime-local"
              className={inputClass}
              style={inputStyle}
              value={values.startAt}
              onChange={(e) => onChange({ startAt: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-[var(--muted)]">结束时间</span>
            <input
              type="datetime-local"
              className={inputClass}
              style={inputStyle}
              value={values.endAt}
              onChange={(e) => onChange({ endAt: e.target.value })}
            />
          </label>
        </>
      ) : values.timeNature === "deadline" ? (
        <label className="block">
          <span className="text-[var(--muted)]">Deadline *</span>
          <input
            type="datetime-local"
            className={inputClass}
            style={inputStyle}
            value={values.deadlineAt}
            onChange={(e) => onChange({ deadlineAt: e.target.value })}
          />
        </label>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[var(--muted)]">重要程度</span>
          <select
            className={inputClass}
            style={inputStyle}
            value={values.importance}
            onChange={(e) => onChange({ importance: e.target.value as PriorityLevel })}
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[var(--muted)]">紧急程度</span>
          <select
            className={inputClass}
            style={inputStyle}
            value={values.urgency}
            onChange={(e) => onChange({ urgency: e.target.value as PriorityLevel })}
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-[var(--muted)]">分类</span>
        <select
          className={inputClass}
          style={inputStyle}
          value={values.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
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
  if (values.timeNature === "duration") {
    if (!values.startAt) errors.push("请填写开始时间");
    const s = localInputToIso(values.startAt);
    const e = values.endAt ? localInputToIso(values.endAt) : null;
    if (s && e && new Date(e) <= new Date(s)) errors.push("结束时间必须晚于开始时间");
  } else if (values.timeNature === "deadline" && !values.deadlineAt) {
    errors.push("请填写 deadline");
  }
  return errors;
}

export function formValuesToInput(values: CardFormValues) {
  const base = {
    title: values.title.trim(),
    importance: values.importance,
    urgency: values.urgency,
    categoryId: values.categoryId || undefined,
    description: values.description.trim() || null,
  };
  if (values.timeNature == null) {
    return {
      ...base,
      timeNature: null as null,
      startAt: null,
      endAt: null,
      deadlineAt: null,
    };
  }
  if (values.timeNature === "duration") {
    return {
      ...base,
      timeNature: "duration" as const,
      startAt: localInputToIso(values.startAt),
      endAt: values.endAt ? localInputToIso(values.endAt) : null,
      deadlineAt: null,
    };
  }
  return {
    ...base,
    timeNature: "deadline" as const,
    startAt: null,
    endAt: null,
    deadlineAt: localInputToIso(values.deadlineAt),
  };
}

export function cardToFormValues(card: ScheduleCard, categories: { id: string; name: string }[]): CardFormValues {
  const personal = categories.find((c) => c.name === "个人") ?? categories[0];
  return {
    title: card.title,
    timeNature: card.timeNature,
    startAt: isoToLocalInput(card.startAt),
    endAt: isoToLocalInput(card.endAt),
    deadlineAt: isoToLocalInput(card.deadlineAt),
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
    timeNature: null,
    startAt: "",
    endAt: "",
    deadlineAt: "",
    importance: "medium",
    urgency: "medium",
    categoryId: personal?.id ?? "",
    description: "",
  };
}

export function isTitleConflictError(err: unknown): boolean {
  return err instanceof Error && err.message === "Title already exists";
}
