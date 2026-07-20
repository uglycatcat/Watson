import { useState, type RefObject, type KeyboardEvent } from "react";
import type { CardStage, Category, ScheduleCard } from "../../lib/api";
import { useCategoryMutations } from "../../hooks/useCategoryMutations";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { PriorityField } from "./PriorityPicker";
import { StageBadge } from "./StageBadge";

export interface CardFormValues {
  title: string;
  startAt: string;
  endAt: string;
  importance: number;
  urgency: number;
  categoryId: string;
  stage: CardStage;
  description: string;
}

interface CardFormFieldsProps {
  values: CardFormValues;
  onChange: (patch: Partial<CardFormValues>) => void;
  categories: Category[];
  errors?: string[];
  readOnly?: boolean;
  titleInputRef?: RefObject<HTMLInputElement | null>;
  onTitleKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onTitleCompositionStart?: () => void;
  onTitleCompositionEnd?: () => void;
}

const inputClass = "w-full px-2 py-1.5 rounded-md border text-sm transition-interactive";
const inputStyle = { borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" };

function endLocalPlus24h(startLocal: string): string {
  const startIso = localInputToIso(startLocal);
  if (!startIso) return "";
  return isoToLocalInput(new Date(new Date(startIso).getTime() + 24 * 60 * 60 * 1000).toISOString());
}

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
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const { createCategory, deleteCategory, isCreatingCategory, isDeletingCategory } = useCategoryMutations();
  const selectedCategory = categories.find((category) => category.id === values.categoryId);

  const addCategory = async () => {
    const name = categoryName.trim();
    if (!name) return setCategoryError("请输入分类名称");
    try {
      const created = await createCategory(name);
      onChange({ categoryId: created.id });
      setCategoryName("");
      setAddingCategory(false);
      setCategoryError("");
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "分类创建失败");
    }
  };

  const removeCategory = async () => {
    if (!deleteCategoryId) return;
    try {
      await deleteCategory(deleteCategoryId);
      const none = categories.find((category) => category.name === "无");
      if (values.categoryId === deleteCategoryId) onChange({ categoryId: none?.id ?? "" });
      setDeleteCategoryId(null);
      setCategoryError("");
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "分类删除失败");
    }
  };

  const onStartChange = (startAt: string) => {
    const patch: Partial<CardFormValues> = { startAt };
    if (startAt) {
      const startIso = localInputToIso(startAt);
      const endIso = values.endAt ? localInputToIso(values.endAt) : null;
      const needRefill = !values.endAt || !endIso || !startIso || new Date(endIso) < new Date(startIso);
      if (needRefill) patch.endAt = endLocalPlus24h(startAt);
    }
    onChange(patch);
  };

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
      <fieldset disabled={readOnly} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[var(--muted)]">开始时间</span>
          <input
            type="datetime-local"
            className={inputClass}
            style={inputStyle}
            value={values.startAt}
            onChange={(e) => onStartChange(e.target.value)}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block">
          <span className="flex items-center justify-between text-[var(--muted)]">
            分类
            {!readOnly && (
              <span className="flex gap-1">
                <button type="button" className="category-inline-action" onClick={(event) => { event.preventDefault(); setAddingCategory((value) => !value); }}>新增</button>
                {selectedCategory?.deletable && <button type="button" className="category-inline-action danger" onClick={(event) => { event.preventDefault(); setDeleteCategoryId(selectedCategory.id); }}>删除</button>}
              </span>
            )}
          </span>
          <select className={inputClass} style={inputStyle} value={values.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })} disabled={readOnly}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {addingCategory && (
            <span className="flex gap-1 mt-1">
              <input aria-label="新分类名称" autoFocus className={inputClass} style={inputStyle} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addCategory(); } }} />
              <button type="button" className="category-add-button" disabled={isCreatingCategory} onClick={(event) => { event.preventDefault(); void addCategory(); }}>添加</button>
            </span>
          )}
          {categoryError && <span className="block text-xs text-red-600 mt-1" role="alert">{categoryError}</span>}
        </label>
        <label className="block">
          <span className="text-[var(--muted)]">日程阶段</span>
          {readOnly ? (
            <div className="mt-2"><StageBadge stage={values.stage} /></div>
          ) : (
            <select className={inputClass} style={inputStyle} value={values.stage} onChange={(e) => onChange({ stage: e.target.value as CardStage })}>
              <option value="not_started">未开始</option>
              <option value="in_progress">正在处理</option>
              <option value="wrapping_up">等待收尾</option>
            </select>
          )}
        </label>
      </div>
      <label className="block">
        <span className="text-[var(--muted)]">描述（可选）</span>
        <textarea
          className={inputClass}
          style={inputStyle}
          rows={4}
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </label>
      <ConfirmDialog
        open={!!deleteCategoryId}
        title="删除分类"
        message={`删除「${categories.find((category) => category.id === deleteCategoryId)?.name ?? ""}」后，关联卡片会归入「无」，卡片本身不会被删除。`}
        confirmLabel="删除分类"
        onConfirm={() => void removeCategory()}
        onCancel={() => setDeleteCategoryId(null)}
        loading={isDeletingCategory}
      />
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
  if (values.startAt && !values.endAt) errors.push("已安排卡片必须填写结束时间");
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
    stage: values.stage,
    description: values.description.trim() || null,
    startAt: values.startAt ? localInputToIso(values.startAt) : null,
    endAt: values.endAt ? localInputToIso(values.endAt) : null,
  };
}

export function cardToFormValues(card: ScheduleCard, categories: Category[]): CardFormValues {
  const personal = categories.find((c) => c.name === "个人") ?? categories.find((c) => c.name === "无");
  return {
    title: card.title,
    startAt: isoToLocalInput(card.startAt),
    endAt: isoToLocalInput(card.endAt),
    importance: card.importance,
    urgency: card.urgency,
    categoryId: card.categoryId || personal?.id || "",
    stage: card.stage ?? "not_started",
    description: card.description ?? "",
  };
}

export function emptyFormValues(categories: Category[]): CardFormValues {
  const personal = categories.find((c) => c.name === "个人") ?? categories.find((c) => c.name === "无");
  return {
    title: "",
    startAt: "",
    endAt: "",
    importance: 5,
    urgency: 5,
    categoryId: personal?.id ?? "",
    stage: "not_started",
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
    a.stage === b.stage &&
    a.description === b.description
  );
}
