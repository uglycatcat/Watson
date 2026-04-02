import { useRef, useState } from "react";
import { useScheduleStore } from "../store/useScheduleStore";
import type { Schedule } from "../types/schedule";
import {
  downloadSchedulesBackup,
  persistSchedulesToAllPlaces,
} from "../utils/schedulePersistence";
import { parseSchedulesJson } from "../utils/storage";

const DEFAULT_FILENAME = "watson_schedules.json";

type DataFileControlsProps = {
  schedules: Schedule[];
  /** 是否已从 /data/watson_schedules.json 加载（npm run preview 下可写回仓库） */
  jsonFromServer: boolean;
};

export function DataFileControls({
  schedules,
  jsonFromServer,
}: DataFileControlsProps) {
  const [error, setError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const clearError = () => setError(null);

  const handleExport = () => {
    clearError();
    downloadSchedulesBackup(schedules, DEFAULT_FILENAME);
  };

  const handleImportPick = () => {
    clearError();
    importRef.current?.click();
  };

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = parseSchedulesJson(await file.text());
      useScheduleStore.setState({ schedules: data });
      persistSchedulesToAllPlaces(data);
    } catch (err) {
      setError((err as Error).message ?? String(err));
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-watson-muted">数据</p>
      <p className="text-[11px] leading-snug text-slate-500">
        使用 <code className="rounded bg-black/25 px-1">npm run preview</code>{" "}
        时，日程从 <code className="rounded bg-black/25 px-1">/data/watson_schedules.json</code>{" "}
        读取，修改会写回{" "}
        <code className="rounded bg-black/25 px-1">dist</code> 与{" "}
        <code className="rounded bg-black/25 px-1">public/data</code>。纯静态部署无写接口，请用导出/导入。
      </p>
      {jsonFromServer ? (
        <p className="text-xs text-emerald-300/90">已连接站点 JSON（preview 可写盘）</p>
      ) : (
        <p className="text-xs text-amber-200/80">
          未读到站点 JSON，当前为浏览器缓存；请确认已 build 并用 preview 打开
        </p>
      )}
      {error ? (
        <p className="rounded-lg bg-rose-500/15 px-2 py-1 text-[11px] text-rose-200">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-watson-border bg-watson-bg px-2 py-1.5 text-left text-xs text-white transition hover:border-slate-500"
        >
          导出备份（下载）
        </button>
        <button
          type="button"
          onClick={handleImportPick}
          className="rounded-lg border border-watson-border bg-watson-bg px-2 py-1.5 text-left text-xs text-white transition hover:border-slate-500"
        >
          从 JSON 导入（替换当前列表）
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportChange}
        />
      </div>
    </div>
  );
}
