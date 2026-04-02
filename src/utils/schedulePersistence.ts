import type { Schedule } from "../types/schedule";
import {
  loadSchedules,
  parseSchedulesJson,
  saveSchedules,
  serializeSchedules,
} from "./storage";

/** 构建产物中的默认数据（与仓库 public/data 一致，build 时拷贝到 dist） */
export const PUBLIC_SCHEDULES_URL = "/data/watson_schedules.json";

const SAVE_ENDPOINT = "/__watson/save-schedules";

/** 已成功从 HTTP 加载 JSON 时，尝试通过 preview 中间件写回磁盘 */
let serverJsonSaveEnabled = false;

function setServerJsonSaveEnabled(enabled: boolean): void {
  serverJsonSaveEnabled = enabled;
}

async function fetchSchedulesJson(): Promise<Schedule[] | null> {
  try {
    const r = await fetch(PUBLIC_SCHEDULES_URL, { cache: "no-store" });
    if (r.status === 404) return [];
    if (!r.ok) return null;
    return parseSchedulesJson(await r.text());
  } catch {
    return null;
  }
}

async function postSchedulesToServer(data: Schedule[]): Promise<void> {
  const res = await fetch(SAVE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: serializeSchedules(data),
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
}

export function persistSchedulesToAllPlaces(data: Schedule[]): void {
  saveSchedules(data);
  if (serverJsonSaveEnabled) {
    void postSchedulesToServer(data).catch(() => {});
  }
}

export type BootstrapResult = {
  schedules: Schedule[];
  /** 是否已从站点 JSON 加载（可触发 preview 写盘） */
  jsonFromServer: boolean;
};

export async function bootstrapSchedules(): Promise<BootstrapResult> {
  setServerJsonSaveEnabled(false);
  const remote = await fetchSchedulesJson();
  if (remote !== null) {
    saveSchedules(remote);
    setServerJsonSaveEnabled(true);
    return { schedules: remote, jsonFromServer: true };
  }
  return {
    schedules: loadSchedules(),
    jsonFromServer: false,
  };
}

export function downloadSchedulesBackup(data: Schedule[], filename: string): void {
  const blob = new Blob([serializeSchedules(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
