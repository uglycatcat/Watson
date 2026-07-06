import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ChatMessage } from "../../lib/api";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [pendingUser, setPendingUser] = useState<ChatMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["chat", "session"],
    queryFn: () => api.createChatSession(),
    staleTime: Infinity,
    retry: 1,
  });

  const sessionId = session?.id ?? null;

  const { data: history } = useQuery({
    queryKey: ["chat", sessionId, "messages"],
    queryFn: () => api.getChatMessages(sessionId!),
    enabled: !!sessionId,
  });

  const send = useMutation({
    mutationFn: (content: string) => api.sendChatMessage(sessionId!, content),
    onMutate: (content) => {
      setPendingUser({
        id: `pending-${Date.now()}`,
        role: "user",
        content,
        relatedCardId: null,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setPendingUser(null);
      qc.invalidateQueries({ queryKey: ["chat", sessionId, "messages"] });
    },
    onError: () => {
      setPendingUser(null);
    },
  });

  const messages = useMemo(() => {
    const items = [...(history?.items ?? [])];
    if (pendingUser && !items.some((m) => m.role === "user" && m.content === pendingUser.content)) {
      items.push(pendingUser);
    }
    if (send.data?.message && !items.some((m) => m.id === send.data!.message.id)) {
      items.push(send.data.message);
    }
    return items;
  }, [history?.items, pendingUser, send.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, send.isPending]);

  const onSend = () => {
    const text = input.trim();
    if (!text || !sessionId || send.isPending) return;
    setInput("");
    send.mutate(text);
  };

  const sessionErrorMsg = sessionError instanceof Error ? sessionError.message : sessionError ? "无法创建对话" : null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b font-medium text-sm" style={{ borderColor: "var(--border)" }}>
        AI 助手
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {sessionLoading && <p style={{ color: "var(--muted)" }}>连接中…</p>}
        {sessionErrorMsg && (
          <div className="space-y-2">
            <p className="text-red-500">{sessionErrorMsg}</p>
            <button
              type="button"
              onClick={() => void refetchSession()}
              className="text-sm px-2 py-1 rounded border"
              style={{ borderColor: "var(--border)" }}
            >
              重试
            </button>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[90%] p-2 rounded ${m.role === "user" ? "ml-auto" : ""}`}
            style={{
              background: m.role === "user" ? "var(--accent)" : "var(--bg)",
              color: m.role === "user" ? "#fff" : "var(--fg)",
              opacity: m.id.startsWith("pending-") ? 0.75 : 1,
            }}
          >
            {m.content}
          </div>
        ))}
        {send.isPending && <p style={{ color: "var(--muted)" }}>思考中…</p>}
        {send.error && <p className="text-red-500">{(send.error as Error).message}</p>}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), onSend())}
          placeholder="与 AI 自由对话…"
          disabled={!sessionId || sessionLoading}
          className="flex-1 px-3 py-2 rounded border text-sm disabled:opacity-50"
          style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={send.isPending || !sessionId || sessionLoading}
          className="px-3 py-2 rounded text-white text-sm disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
