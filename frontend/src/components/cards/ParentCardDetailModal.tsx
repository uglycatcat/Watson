import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  envelopeFromCards,
  type ScheduleCard,
} from "../../lib/api";
import { cardDateSubtitle, isOverdueCard, sortByStageThenCreatedAtDesc } from "../../lib/cardDisplay";
import { useCardMutations } from "../../hooks/useCardMutations";
import { Modal } from "../ui/Modal";
import {
  formatCardTimestamp,
  isTitleConflictError,
  isoToLocalInput,
  localInputToIso,
} from "./CardFormFields";
import { PriorityMeter } from "./PriorityMeter";
import { StageBadge } from "./StageBadge";
import { CategoryBadge } from "./CategoryBadge";
import { CompleteCheckbox } from "./CompleteCheckbox";
import { getCategoryAccent } from "../../lib/categoryColor";
import { setDragCardId } from "../dnd/dragTrash";

interface ParentCardDetailModalProps {
  parentId: string | null;
  /** 0→1 compose draft: two independent standards; not persisted until confirm. */
  draftChildren?: ScheduleCard[] | null;
  knownTitles?: string[];
  onClose: () => void;
  onOpenChild?: (child: ScheduleCard) => void;
  onDraftCreated?: (parent: ScheduleCard, sourceIds: string[]) => void;
}

function isDuplicateTitle(title: string, knownTitles: string[], selfTitle: string): boolean {
  const norm = title.trim().toLowerCase();
  if (!norm || norm === selfTitle.trim().toLowerCase()) return false;
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

export function ParentCardDetailModal({
  parentId,
  draftChildren = null,
  knownTitles = [],
  onClose,
  onOpenChild,
  onDraftCreated,
}: ParentCardDetailModalProps) {
  const isDraft = !parentId && !!draftChildren && draftChildren.length >= 2;
  const { updateCard, detachChild, composeParent, isUpdating, isDetaching, isComposing } =
    useCardMutations();
  const { data: parent, isLoading, refetch } = useQuery({
    queryKey: ["cards", "detail", parentId],
    queryFn: () => api.getCardById(parentId!),
    enabled: !!parentId,
  });

  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [snapshot, setSnapshot] = useState({ title: "", startAt: "", endAt: "" });
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOutside, setDragOutside] = useState(false);
  const dragOutsideRef = useRef(false);
  const childrenZoneRef = useRef<HTMLDivElement>(null);
  const parentIdRef = useRef<string | null>(null);
  const draftKeyRef = useRef<string | null>(null);

  const children = useMemo(() => {
    if (isDraft && draftChildren) {
      return sortByStageThenCreatedAtDesc(draftChildren);
    }
    return sortByStageThenCreatedAtDesc(parent?.children ?? []);
  }, [isDraft, draftChildren, parent?.children]);

  const childEnvelope = useMemo(() => envelopeFromCards(children), [children]);
  const dirty =
    title !== snapshot.title || startAt !== snapshot.startAt || endAt !== snapshot.endAt;
  const canConfirmDraft = title.trim().length > 0;

  useEffect(() => {
    if (!isDraft || !draftChildren) return;
    const key = draftChildren.map((c) => c.id).sort().join("|");
    if (draftKeyRef.current === key) return;
    draftKeyRef.current = key;
    parentIdRef.current = null;
    const env = envelopeFromCards(draftChildren);
    const next = {
      title: "",
      startAt: isoToLocalInput(env.startAt),
      endAt: isoToLocalInput(env.endAt),
    };
    setTitle(next.title);
    setStartAt(next.startAt);
    setEndAt(next.endAt);
    setSnapshot(next);
    setErrors([]);
  }, [isDraft, draftChildren]);

  useEffect(() => {
    if (isDraft || !parent || parentIdRef.current === parent.id) return;
    parentIdRef.current = parent.id;
    draftKeyRef.current = null;
    const next = {
      title: parent.title,
      startAt: isoToLocalInput(parent.startAt),
      endAt: isoToLocalInput(parent.endAt),
    };
    setTitle(next.title);
    setStartAt(next.startAt);
    setEndAt(next.endAt);
    setSnapshot(next);
    setErrors([]);
  }, [isDraft, parent?.id, parent?.updatedAt]);

  const validate = (): string[] => {
    const next: string[] = [];
    if (!title.trim()) next.push("请填写名称");
    else if (isDuplicateTitle(title, knownTitles, isDraft ? "" : snapshot.title)) {
      next.push("标题已存在，请使用其他标题");
    }
    if (startAt && !endAt) next.push("已安排时间必须填写结束时间");
    if (startAt && endAt) {
      const s = localInputToIso(startAt);
      const e = localInputToIso(endAt);
      if (s && e && new Date(e) < new Date(s)) next.push("结束时间不能早于开始时间");
      if (s && e && isNarrowerThanEnvelope(s, e, childEnvelope)) {
        next.push("父卡片时间不能窄于子卡片包络");
      }
    }
    return next;
  };

  const handleClose = () => {
    parentIdRef.current = null;
    draftKeyRef.current = null;
    onClose();
  };

  const handleSave = async () => {
    if (isDraft) {
      if (!draftChildren || draftChildren.length < 2) return;
      const v = validate();
      if (v.length) {
        setErrors(v);
        return;
      }
      setErrors([]);
      try {
        const created = await composeParent({
          cardIds: [draftChildren[0].id, draftChildren[1].id] as [string, string],
          title: title.trim(),
          startAt: startAt ? localInputToIso(startAt) : null,
          endAt: endAt ? localInputToIso(endAt) : null,
        });
        onDraftCreated?.(created, [draftChildren[0].id, draftChildren[1].id]);
        handleClose();
      } catch (err) {
        if (isTitleConflictError(err)) {
          setErrors(["标题已存在，请使用其他标题"]);
        } else {
          setErrors([err instanceof Error ? err.message : "创建失败"]);
        }
      }
      return;
    }

    if (!parent || !dirty) {
      handleClose();
      return;
    }
    const v = validate();
    if (v.length) {
      setErrors(v);
      return;
    }
    setErrors([]);
    try {
      await updateCard({
        id: parent.id,
        body: {
          title: title.trim(),
          startAt: startAt ? localInputToIso(startAt) : null,
          endAt: endAt ? localInputToIso(endAt) : null,
        },
      });
      handleClose();
    } catch (err) {
      if (isTitleConflictError(err)) {
        setErrors(["标题已存在，请使用其他标题"]);
      } else {
        setErrors([err instanceof Error ? err.message : "保存失败"]);
      }
    }
  };

  const handleReset = () => {
    setTitle(snapshot.title);
    setStartAt(snapshot.startAt);
    setEndAt(snapshot.endAt);
    setErrors([]);
  };

  const handleDetach = async (childId: string) => {
    if (isDraft) return;
    try {
      await detachChild(childId);
      const { data } = await refetch();
      // 最后一张子卡离开后父卡被后端自动删除（children 归零），关闭弹窗回到管理页；
      // 仍有子卡（含仅剩一张）时父卡保留，弹窗不关。
      if ((data?.children?.length ?? 0) === 0) handleClose();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "移出失败"]);
    }
  };

  if (!parentId && !isDraft) return null;

  const inputClass = "w-full px-2 py-1.5 rounded-md border text-sm transition-interactive";
  const inputStyle = { borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" };
  const actionBtnClass = "text-sm px-3 py-1.5 border transition-interactive shell-btn";
  const actionBtnStyle = {
    borderColor: "var(--border)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg)",
    color: "var(--fg)",
  } as const;

  const showBody = isDraft || (!!parent && !isLoading);
  const modalTitle = isDraft ? "父卡片详情" : (parent?.title ?? "父卡片详情");

  return (
    <Modal open={!!parentId || isDraft} onClose={handleClose} title={modalTitle} className="max-w-3xl">
      {isLoading && !parent && !isDraft ? (
        <p style={{ color: "var(--muted)" }}>加载中…</p>
      ) : showBody ? (
        <div>
          {errors.length ? (
            <ul className="text-red-600 text-xs space-y-1 mb-3">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
          {isDraft ? (
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              请填写名称后确认创建。关闭或取消将放弃组合，两张卡片保持原状。
            </p>
          ) : null}
          <div className="space-y-3 text-sm">
            <label className="block">
              <span style={{ color: "var(--muted)" }}>名称 *</span>
              <input
                className={inputClass}
                style={inputStyle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setErrors(validate())}
                autoFocus={isDraft}
                placeholder={isDraft ? "请输入父卡片名称" : undefined}
              />
            </label>
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            {!startAt && !endAt && (isDraft || parent?.startAt == null) && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                当前未安排
              </p>
            )}
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">子卡片</h3>
            <div
              ref={childrenZoneRef}
              className={`parent-children-zone rounded-lg border p-2 min-h-[72px] max-h-[min(420px,50vh)] overflow-y-auto ${
                !isDraft && dragOutside ? "is-detach-target" : ""
              }`}
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              onDragOver={(e) => {
                if (!isDraft) e.preventDefault();
              }}
            >
              {children.length === 0 ? (
                <p className="text-xs py-2 text-center" style={{ color: "var(--muted)" }}>
                  暂无子卡片
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {children.map((child) => {
                    const openChild = () => {
                      if (isDraft) return;
                      onOpenChild?.(child);
                    };
                    return (
                      <div
                        key={child.id}
                        role={isDraft ? undefined : "button"}
                        tabIndex={isDraft ? undefined : 0}
                        draggable={!isDraft}
                        onClick={openChild}
                        onKeyDown={(e) => {
                          if (isDraft) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openChild();
                          }
                        }}
                        onDragStart={
                          isDraft
                            ? undefined
                            : (e) => {
                                setDragCardId(e.dataTransfer, child.id);
                                dragOutsideRef.current = false;
                                setDragOutside(false);
                              }
                        }
                        onDrag={
                          isDraft
                            ? undefined
                            : (e) => {
                                const zone = childrenZoneRef.current;
                                if (!zone) return;
                                const rect = zone.getBoundingClientRect();
                                const outside =
                                  e.clientX < rect.left ||
                                  e.clientX > rect.right ||
                                  e.clientY < rect.top ||
                                  e.clientY > rect.bottom;
                                dragOutsideRef.current = outside;
                                setDragOutside(outside);
                              }
                        }
                        onDragEnd={
                          isDraft
                            ? undefined
                            : () => {
                                if (dragOutsideRef.current) void handleDetach(child.id);
                                dragOutsideRef.current = false;
                                setDragOutside(false);
                              }
                        }
                        className={`schedule-card relative w-full text-left text-sm transition-interactive hover:opacity-95 flex gap-2 min-h-[88px] overflow-hidden show-hover-bar ${
                          isDraft ? "" : "cursor-grab"
                        }${!isDraft && isOverdueCard(child) ? " is-overdue" : ""}`}
                        style={{
                          background: "var(--panel)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-lg)",
                          boxShadow: "var(--shadow-sm)",
                          padding: "var(--space-3)",
                          borderLeftWidth: "4px",
                          borderLeftColor: getCategoryAccent(child.categoryColor),
                        }}
                      >
                        <span className="card-hover-bar" aria-hidden />
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <div className="font-semibold line-clamp-1" style={{ fontSize: "var(--text-sm)" }}>
                            {child.title}
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="text-xs line-clamp-1 min-w-0 flex-1" style={{ color: "var(--muted)" }}>
                              {cardDateSubtitle(child)}
                            </div>
                            <span className="inline-flex items-center gap-1 shrink-0">
                              <CategoryBadge name={child.categoryName} color={child.categoryColor} compact />
                              <StageBadge stage={child.stage} compact />
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 mt-0.5 w-full min-w-0">
                            <PriorityMeter label="重要" value={child.importance} compact />
                            <PriorityMeter label="紧急" value={child.urgency} compact />
                          </div>
                        </div>
                        {!isDraft && (
                          <CompleteCheckbox
                            cardId={child.id}
                            className="mt-0.5"
                            onComplete={() => {
                              void refetch().then(({ data }) => {
                                if ((data?.children?.length ?? 0) === 0) handleClose();
                              });
                            }}
                          />
                        )}
                        {isDraft && <span className="shrink-0 w-5 mt-0.5" aria-hidden />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
              {isDraft ? "确认创建后可在此管理子卡片" : "将子卡片拖出下方区域可移出"}
            </p>
          </div>

          {!isDraft && parent ? (
            <footer
              className="mt-4 pt-3 border-t text-[10px] space-y-0.5"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              <div>创建时间：{formatCardTimestamp(parent.createdAt)}</div>
              <div>最后修改时间：{formatCardTimestamp(parent.updatedAt)}</div>
              {parent.childCount != null && <div>子卡片数：{parent.childCount}</div>}
            </footer>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
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
              disabled={
                isDraft
                  ? !canConfirmDraft || isComposing
                  : isUpdating || isDetaching
              }
              className={`${actionBtnClass} btn-accent text-white disabled:opacity-40`}
              style={{ ...actionBtnStyle, background: "var(--accent)", borderColor: "var(--accent)" }}
            >
              {isDraft ? (isComposing ? "创建中…" : "确认") : isUpdating ? "保存中…" : "确认"}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ color: "var(--muted)" }}>未找到父卡片</p>
      )}
    </Modal>
  );
}
