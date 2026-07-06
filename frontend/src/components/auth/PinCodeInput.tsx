import { useCallback, useEffect, useRef, useState } from "react";

interface PinCodeInputProps {
  length?: number;
  onComplete: (code: string) => void | Promise<void>;
  failed?: boolean;
  onClearFailure?: () => void;
  disabled?: boolean;
}

export function PinCodeInput({
  length = 4,
  onComplete,
  failed = false,
  onClearFailure,
  disabled = false,
}: PinCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef("");
  const submittingRef = useRef(false);

  const syncDisplay = useCallback(
    (value: string) => {
      const letters = value.slice(0, length).split("");
      setDigits(Array(length).fill("").map((_, i) => letters[i] ?? ""));
    },
    [length],
  );

  const reset = useCallback(() => {
    bufferRef.current = "";
    syncDisplay("");
    submittingRef.current = false;
    inputRef.current?.focus();
  }, [syncDisplay]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (failed) {
      const t = window.setTimeout(() => {
        reset();
        onClearFailure?.();
      }, 700);
      return () => window.clearTimeout(t);
    }
  }, [failed, reset, onClearFailure]);

  const submit = async (code: string) => {
    if (submittingRef.current || disabled || code.length !== length) return;
    submittingRef.current = true;
    try {
      await onComplete(code);
    } finally {
      submittingRef.current = false;
    }
  };

  const applyChars = (raw: string) => {
    if (submittingRef.current || disabled) return;

    const merged = (bufferRef.current + raw).toUpperCase().replace(/[^A-Z]/g, "").slice(0, length);
    bufferRef.current = merged;
    syncDisplay(merged);

    if (merged.length === length) {
      void submit(merged);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const added = e.target.value;
    e.target.value = "";
    if (!added) return;
    applyChars(added);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (!bufferRef.current) return;
      bufferRef.current = bufferRef.current.slice(0, -1);
      syncDisplay(bufferRef.current);
    }
  };

  const borderColor = failed ? "#ef4444" : "rgba(255,255,255,0.45)";
  const glow = failed ? "0 0 12px rgba(239,68,68,0.55)" : "none";

  return (
    <div
      className="relative flex gap-3 justify-center cursor-text"
      onClick={() => inputRef.current?.focus()}
      role="group"
      aria-label="验证码"
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="one-time-code"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        disabled={disabled}
        className="absolute inset-0 opacity-0 w-full h-full cursor-text"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-hidden
      />
      {digits.map((d, i) => (
        <div
          key={i}
          className={`relative z-10 w-14 h-16 flex items-center justify-center text-2xl font-bold tracking-widest transition-all duration-200 pointer-events-none ${
            failed ? "animate-[shake_0.45s_ease-in-out]" : ""
          }`}
          style={{
            border: `2px solid ${borderColor}`,
            boxShadow: glow,
            color: "#fff",
            background: failed ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
          }}
        >
          {d}
        </div>
      ))}
    </div>
  );
}
