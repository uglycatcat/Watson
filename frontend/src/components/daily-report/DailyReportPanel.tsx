import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type DailyReport } from "../../lib/api";
import { DailyReportField } from "./DailyReportField";

type Snapshot = Pick<DailyReport, "goal" | "result" | "analysis">;
const EMPTY: Snapshot = { goal: "", result: "", analysis: "" };

function toSnapshot(item: DailyReport | null | undefined): Snapshot {
  if (!item) return EMPTY;
  return { goal: item.goal ?? "", result: item.result ?? "", analysis: item.analysis ?? "" };
}

export function DailyReportPanel({ date }: { date: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["daily-report", date],
    queryFn: () => api.getDailyReport(date),
  });
  const [draft, setDraft] = useState<Snapshot>(EMPTY);
  const [saved, setSaved] = useState<Snapshot>(EMPTY);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const queueRef = useRef(Promise.resolve());
  const dateRef = useRef(date);
  const loadedDateRef = useRef(date);
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);

  useEffect(() => {
    dateRef.current = date;
    const next = toSnapshot(data?.item);
    const dateChanged = loadedDateRef.current !== date;
    const hasLocalChanges =
      JSON.stringify(draftRef.current) !== JSON.stringify(savedRef.current);
    loadedDateRef.current = date;
    if (dateChanged || !hasLocalChanges) {
      draftRef.current = next;
      savedRef.current = next;
      setDraft(next);
      setSaved(next);
    }
    setStatus(isError ? "error" : "idle");
    if (dateChanged) queueRef.current = Promise.resolve();
  }, [date, data?.item?.updatedAt, isError]);

  const save = async () => {
    const saveDate = date;
    const snapshot = { ...draftRef.current };
    if (JSON.stringify(snapshot) === JSON.stringify(savedRef.current)) return;
    setStatus("saving");
    const operation = queueRef.current.then(async () => {
      try {
        const result = await api.putDailyReport(saveDate, snapshot);
        queryClient.setQueryData(["daily-report", saveDate], { item: result });
        if (dateRef.current === saveDate) {
          savedRef.current = snapshot;
          setSaved(snapshot);
          setStatus("idle");
        }
      } catch (error) {
        if (dateRef.current === saveDate) setStatus("error");
        throw error;
      }
    });
    queueRef.current = operation.catch(() => undefined);
    await operation.catch(() => undefined);
  };

  if (isLoading) return <div className="daily-report-panel" aria-label="日报加载中">{[0, 1, 2].map((item) => <div key={item} className="daily-report-skeleton" />)}</div>;

  const fields = [
    ["goal", "Goal"],
    ["result", "Result"],
    ["analysis", "Analysis & Insight"],
  ] as const;
  return (
    <div>
      {isError && <button type="button" className="daily-report-retry" onClick={() => void refetch()}>日报读取失败，点击重试</button>}
      <div className="daily-report-panel">
        {fields.map(([key, label]) => (
          <DailyReportField
            key={key}
            label={label}
            value={draft[key]}
            status={status}
            onChange={(value) => {
              setDraft((current) => {
                const next = { ...current, [key]: value };
                draftRef.current = next;
                return next;
              });
            }}
            onSave={save}
          />
        ))}
      </div>
    </div>
  );
}
