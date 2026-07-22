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

  const filledCount = digits.filter(Boolean).length;

  return (
    <div
      className={`login-pin${failed ? " is-failed" : ""}${disabled ? " is-disabled" : ""}`}
      onClick={() => inputRef.current?.focus()}
      role="group"
      aria-label="四字符验证码"
    >
      <input
        id="login-pin-input"
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="one-time-code"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        disabled={disabled}
        className="login-pin__input"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label="四字符验证码输入"
      />
      {digits.map((d, i) => (
        <div
          key={i}
          className={`login-pin__cell${d ? " is-filled" : ""}${i === filledCount ? " is-active" : ""}${
            failed ? " is-shake" : ""
          }`}
          aria-hidden
        >
          {d}
        </div>
      ))}
    </div>
  );
}
