import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type MonthlyReport } from "../../lib/api";
import { MonthlyGraiField } from "./MonthlyGraiField";

type Snapshot = Pick<MonthlyReport, "goal" | "result" | "analysis">;
type FieldKey = keyof Snapshot;

const EMPTY: Snapshot = { goal: "", result: "", analysis: "" };

const FIELDS = [
  { key: "goal" as const, label: "Goal", tab: "Goal" },
  { key: "result" as const, label: "Result", tab: "Result" },
  { key: "analysis" as const, label: "Analysis & Insight", tab: "Analysis" },
];

function toSnapshot(item: MonthlyReport | null | undefined): Snapshot {
  if (!item) return EMPTY;
  return { goal: item.goal ?? "", result: item.result ?? "", analysis: item.analysis ?? "" };
}

function pickInitialField(snapshot: Snapshot): FieldKey {
  for (const field of FIELDS) {
    if (snapshot[field.key].trim()) return field.key;
  }
  return "goal";
}

export type MonthlyGraiPanelHandle = {
  /** Blur active editor and persist current draft for the active month. */
  flush: () => Promise<void>;
};

export const MonthlyGraiPanel = forwardRef<MonthlyGraiPanelHandle, { month: string }>(
  function MonthlyGraiPanel({ month }, ref) {
    const queryClient = useQueryClient();
    const { data, isLoading, isError, refetch } = useQuery({
      queryKey: ["monthly-report", month],
      queryFn: () => api.getMonthlyReport(month),
    });
    const [draft, setDraft] = useState<Snapshot>(EMPTY);
    const [saved, setSaved] = useState<Snapshot>(EMPTY);
    const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
    const [active, setActive] = useState<FieldKey>("goal");
    const queueRef = useRef(Promise.resolve());
    const monthRef = useRef(month);
    const loadedMonthRef = useRef(month);
    const draftRef = useRef(draft);
    const savedRef = useRef(saved);
    const tabPickedForMonthRef = useRef<string | null>(null);
    const activeField = useMemo(() => FIELDS.find((f) => f.key === active) ?? FIELDS[0], [active]);
    const activeIndex = FIELDS.findIndex((f) => f.key === active);

    const saveCurrent = async () => {
      const saveMonth = monthRef.current;
      const snapshot = { ...draftRef.current };
      if (JSON.stringify(snapshot) === JSON.stringify(savedRef.current)) return;
      setStatus("saving");
      const operation = queueRef.current.then(async () => {
        try {
          const result = await api.putMonthlyReport(saveMonth, snapshot);
          queryClient.setQueryData(["monthly-report", saveMonth], { item: result });
          if (monthRef.current === saveMonth) {
            savedRef.current = snapshot;
            setSaved(snapshot);
            setStatus("idle");
          }
        } catch (error) {
          if (monthRef.current === saveMonth) setStatus("error");
          throw error;
        }
      });
      queueRef.current = operation.catch(() => undefined);
      await operation.catch(() => undefined);
    };

    useEffect(() => {
      const prevMonth = loadedMonthRef.current;
      const monthChanged = prevMonth !== month;
      const hasLocalChanges =
        JSON.stringify(draftRef.current) !== JSON.stringify(savedRef.current);
      const next = toSnapshot(data?.item);

      if (monthChanged && hasLocalChanges) {
        const snapshot = { ...draftRef.current };
        const saveMonth = prevMonth;
        const operation = queueRef.current.then(async () => {
          try {
            const result = await api.putMonthlyReport(saveMonth, snapshot);
            queryClient.setQueryData(["monthly-report", saveMonth], { item: result });
          } catch {
            // Best-effort: UI already moved to the new month.
          }
        });
        queueRef.current = operation.catch(() => undefined);
      }

      monthRef.current = month;
      loadedMonthRef.current = month;

      if (monthChanged) {
        draftRef.current = next;
        savedRef.current = next;
        setDraft(next);
        setSaved(next);
        tabPickedForMonthRef.current = null;
      } else if (!hasLocalChanges) {
        draftRef.current = next;
        savedRef.current = next;
        setDraft(next);
        setSaved(next);
      }

      if (data !== undefined && tabPickedForMonthRef.current !== month) {
        setActive(pickInitialField(next));
        tabPickedForMonthRef.current = month;
      }
      setStatus(isError ? "error" : "idle");
    }, [month, data, data?.item?.updatedAt, isError, queryClient]);

    const flush = async () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      await saveCurrent();
    };

    useImperativeHandle(ref, () => ({ flush }), []);

    const switchField = async (key: FieldKey) => {
      if (key === active) return;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      await saveCurrent();
      setActive(key);
    };

    if (isLoading) {
      return (
        <div className="monthly-grai-panel-wrap" aria-label="月报加载中">
          <div className="monthly-grai-tabs monthly-grai-tabs--skeleton" aria-hidden>
            {FIELDS.map((field) => (
              <span key={field.key} className="monthly-grai-tab is-skeleton" />
            ))}
          </div>
          <div className="monthly-grai-page">
            <div className="monthly-grai-skeleton" />
          </div>
        </div>
      );
    }

    return (
      <div className="monthly-grai-panel-wrap">
        {isError && (
          <button type="button" className="monthly-grai-retry" onClick={() => void refetch()}>
            月报读取失败，点击重试
          </button>
        )}

        <div className="monthly-grai-tabs" role="tablist" aria-label="GRAI 分段">
          {FIELDS.map((field) => {
            const selected = field.key === active;
            const filled = draft[field.key].trim().length > 0;
            return (
              <button
                key={field.key}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`monthly-grai-tab ${selected ? "is-active" : ""}`}
                onClick={() => void switchField(field.key)}
              >
                <span className="monthly-grai-tab__label">{field.tab}</span>
                {filled && <span className="monthly-grai-tab__dot" aria-hidden />}
              </button>
            );
          })}
        </div>

        <div className="monthly-grai-page" role="tabpanel">
          <MonthlyGraiField
            key={`${month}-${active}`}
            label={activeField.label}
            value={draft[active]}
            status={status}
            onChange={(value) => {
              setDraft((current) => {
                const next = { ...current, [active]: value };
                draftRef.current = next;
                return next;
              });
            }}
            onSave={saveCurrent}
          />
        </div>

        <div className="monthly-grai-pager">
          <button
            type="button"
            className="monthly-grai-pager__btn"
            disabled={activeIndex <= 0}
            onClick={() => void switchField(FIELDS[activeIndex - 1].key)}
          >
            Previous
          </button>
          <button
            type="button"
            className="monthly-grai-pager__btn"
            disabled={activeIndex >= FIELDS.length - 1}
            onClick={() => void switchField(FIELDS[activeIndex + 1].key)}
          >
            Next
          </button>
        </div>
      </div>
    );
  },
);
