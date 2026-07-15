import { useState } from "react";
import { useCardMutations } from "../../hooks/useCardMutations";

interface CompleteCheckboxProps {
  cardId: string;
  onComplete?: () => void;
  className?: string;
}

export function CompleteCheckbox({ cardId, onComplete, className = "" }: CompleteCheckboxProps) {
  const { completeCard, isCompleting } = useCardMutations();
  const [checked, setChecked] = useState(false);

  return (
    <button
      type="button"
      title="标记完成"
      disabled={isCompleting || checked}
      onClick={(e) => {
        e.stopPropagation();
        if (checked) return;
        setChecked(true);
        void completeCard(cardId)
          .then(() => onComplete?.())
          .catch(() => setChecked(false));
      }}
      className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center text-xs ${className}`}
      style={{
        borderColor: checked ? "var(--accent)" : "var(--border)",
        background: checked ? "var(--accent)" : "var(--bg)",
        color: checked ? "#fff" : "var(--fg)",
      }}
      aria-label="完成"
      aria-checked={checked}
    >
      {checked ? "✓" : null}
    </button>
  );
}
