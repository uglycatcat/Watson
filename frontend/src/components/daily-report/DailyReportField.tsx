import { useEffect, useRef, useState } from "react";
import { MarkdownBody } from "../ui/MarkdownBody";

interface DailyReportFieldProps {
  label: string;
  value: string;
  status?: "idle" | "saving" | "error";
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
}

export function DailyReportField({ label, value, status = "idle", onChange, onSave }: DailyReportFieldProps) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <section className="daily-report-field is-editing">
        <div className="daily-report-label">{label}</div>
        <textarea
          ref={textareaRef}
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            setEditing(false);
            void onSave();
          }}
        />
        <span className="daily-report-status" role="status">
          {status === "saving" ? "保存中…" : status === "error" ? "未保存，点击后重试" : "失焦自动保存"}
        </span>
      </section>
    );
  }

  return (
    <section
      className={`daily-report-field ${status === "error" ? "has-error" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`编辑 ${label}`}
      onClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setEditing(true);
        }
      }}
    >
      <div className="daily-report-label">{label}</div>
      {value ? (
        <MarkdownBody className="daily-report-markdown">{value}</MarkdownBody>
      ) : (
        <div className="daily-report-markdown">
          <span className="daily-report-empty">点击记录…</span>
        </div>
      )}
      <span className="daily-report-status" role="status">
        {status === "saving" ? "保存中…" : status === "error" ? "未保存，点击重试" : ""}
      </span>
    </section>
  );
}
