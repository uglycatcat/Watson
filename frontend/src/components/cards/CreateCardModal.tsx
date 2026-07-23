import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useCardMutations } from "../../hooks/useCardMutations";
import { Modal } from "../ui/Modal";
import {
  CardFormFields,
  emptyFormValues,
  formValuesToInput,
  isTitleConflictError,
  validateCardForm,
  type CardFormValues,
} from "./CardFormFields";

interface CreateCardModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateCardModal({ open, onClose }: CreateCardModalProps) {
  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
    enabled: open,
  });
  const categories = catData?.items ?? [];
  const [values, setValues] = useState<CardFormValues>(() => emptyFormValues([]));
  const [errors, setErrors] = useState<string[]>([]);
  const composingRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const { createCard, isCreating } = useCardMutations();

  useEffect(() => {
    if (open && categories.length) {
      setValues(emptyFormValues(categories));
      setErrors([]);
    }
  }, [open, categories.length]);

  const submit = async () => {
    const v = validateCardForm(values);
    if (v.length) {
      setErrors(v);
      return;
    }
    setErrors([]);
    try {
      await createCard(formValuesToInput(values));
      onClose();
    } catch (err) {
      if (isTitleConflictError(err)) {
        setErrors(["标题已存在，请使用其他标题"]);
      } else {
        setErrors([err instanceof Error ? err.message : "创建失败"]);
      }
    }
  };

  const onTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !composingRef.current) {
      e.preventDefault();
      if (values.title.trim()) void submit();
      else setErrors(["请填写标题"]);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="新建日程">
      <CardFormFields
        values={values}
        onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
        categories={categories}
        errors={errors}
        titleInputRef={titleRef}
        onTitleKeyDown={onTitleKeyDown}
        onTitleCompositionStart={() => {
          composingRef.current = true;
        }}
        onTitleCompositionEnd={() => {
          composingRef.current = false;
        }}
      />
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isCreating}
          className="text-sm px-4 py-1.5 rounded-md transition-interactive"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          {isCreating ? "创建中…" : "确认"}
        </button>
      </div>
    </Modal>
  );
}
