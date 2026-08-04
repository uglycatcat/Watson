import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface MonthlyGraiFieldProps {
  label: string;
  value: string;
  status?: "idle" | "saving" | "error";
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
}

export function MonthlyGraiField({
  label,
  value,
  status = "idle",
  onChange,
  onSave,
}: MonthlyGraiFieldProps) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <section className="monthly-grai-field is-editing">
        <header className="monthly-grai-field__head">
          <div className="monthly-grai-field__label">{label}</div>
        </header>
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
        <span className="monthly-grai-field__status" role="status">
          {status === "saving" ? "保存中…" : status === "error" ? "未保存，点击后重试" : "失焦自动保存"}
        </span>
      </section>
    );
  }

  return (
    <section
      className={`monthly-grai-field ${status === "error" ? "has-error" : ""}`}
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
      <header className="monthly-grai-field__head">
        <div className="monthly-grai-field__label">{label}</div>
      </header>
      <div className="monthly-grai-field__body">
        {value ? (
          <div className="monthly-grai-markdown">
            <ReactMarkdown>{value}</ReactMarkdown>
          </div>
        ) : (
          <span className="monthly-grai-empty">点击记录本月…</span>
        )}
      </div>
      <span className="monthly-grai-field__status" role="status">
        {status === "saving" ? "保存中…" : status === "error" ? "未保存，点击重试" : ""}
      </span>
    </section>
  );
}
