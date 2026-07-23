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
  const [animating, setAnimating] = useState(false);

  return (
    <button
      type="button"
      disabled={isCompleting || checked}
      onClick={(e) => {
        e.stopPropagation();
        if (checked) return;
        setChecked(true);
        setAnimating(true);
        // 先播放对勾动画，动画结束后再真正完成（让卡片带着对勾再消失）
        window.setTimeout(() => {
          setAnimating(false);
          void completeCard(cardId)
            .then(() => onComplete?.())
            .catch(() => setChecked(false));
        }, 280);
      }}
      className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center text-xs transition-interactive ${className}`}
      style={{
        borderColor: checked ? "var(--accent)" : "var(--border)",
        background: checked ? "var(--accent)" : "var(--bg)",
        color: checked ? "var(--on-accent)" : "transparent",
        animation: animating ? "check-pop 280ms var(--ease-standard)" : undefined,
      }}
      onMouseEnter={(e) => {
        if (!checked) e.currentTarget.style.borderColor = "var(--accent-hover)";
      }}
      onMouseLeave={(e) => {
        if (!checked) e.currentTarget.style.borderColor = "var(--border)";
      }}
      aria-label="完成"
      aria-checked={checked}
    >
      {checked ? "✓" : null}
    </button>
  );
}
