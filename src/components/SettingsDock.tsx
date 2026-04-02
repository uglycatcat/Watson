import { useEffect, useRef, useState } from "react";
import type { Schedule } from "../types/schedule";
import { DataFileControls } from "./DataFileControls";

type SettingsDockProps = {
  schedules: Schedule[];
  jsonFromServer: boolean;
};

export function SettingsDock({ schedules, jsonFromServer }: SettingsDockProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="pointer-events-none fixed bottom-8 left-8 z-40 flex flex-col items-start gap-3">
      {open ? (
        <div
          ref={panelRef}
          className="pointer-events-auto w-80 max-w-[calc(100vw-4rem)] rounded-2xl border border-watson-border bg-watson-surface p-4 shadow-2xl shadow-black/50"
        >
          <DataFileControls schedules={schedules} jsonFromServer={jsonFromServer} />
        </div>
      ) : null}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-watson-border bg-watson-surface text-watson-muted shadow-lg transition hover:border-slate-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-watson-accent"
        aria-expanded={open}
        aria-label="设置与数据"
        title="设置与数据"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M11.078 2.25c-.917 0-1.699.663-1.85 1.557L8.97 4.963c-.282.679-.97 1.13-1.691 1.13H5.25A2.25 2.25 0 003 8.343v1.808c0 .617.304 1.194.81 1.546l1.49.992c.723.482 1.08 1.33.87 2.16l-.298 1.205c-.17.686.02 1.405.51 1.93l1.278 1.33c.524.547 1.31.734 2.01.48l1.125-.42c.673-.252 1.43-.17 2.028.22l.924.615c.57.38 1.305.38 1.875 0l.924-.615c.598-.39 1.355-.472 2.028-.22l1.125.42c.7.254 1.486.067 2.01-.48l1.278-1.33c.49-.525.68-1.244.51-1.93l-.298-1.205c-.21-.83.147-1.678.87-2.16l1.49-.992c.506-.352.81-.929.81-1.546V8.343a2.25 2.25 0 00-2.25-2.25h-2.029c-.72 0-1.409-.451-1.691-1.13l-.458-1.156A1.875 1.875 0 0012.922 2.25h-1.844zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
