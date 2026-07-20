import type { CardStage } from "../../lib/api";

const LABELS: Record<CardStage, string> = {
  not_started: "未开始",
  in_progress: "正在处理",
  wrapping_up: "等待收尾",
};

export function StageBadge({ stage, compact = false }: { stage?: CardStage; compact?: boolean }) {
  const value = stage ?? "not_started";
  return (
    <span
      className={`stage-badge stage-${value} ${compact ? "stage-badge-compact" : ""}`}
      title={`日程阶段：${LABELS[value]}`}
    >
      {LABELS[value]}
    </span>
  );
}
