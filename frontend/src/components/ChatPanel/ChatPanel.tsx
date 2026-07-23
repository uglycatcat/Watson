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
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: sessionErrorMsg ? "var(--tele-critical)" : "var(--accent)",
            boxShadow: sessionErrorMsg
              ? "0 0 8px var(--tele-critical)"
              : "0 0 8px var(--accent-glow)",
          }}
          aria-hidden
        />
        <div className="flex flex-col leading-none">
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: "var(--font-semibold)",
              letterSpacing: "0.12em",
              fontSize: "0.8rem",
              color: "var(--fg-strong)",
            }}
          >
            AI CONSOLE
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              letterSpacing: "0.18em",
              color: "var(--muted)",
              marginTop: "3px",
            }}
          >
            {sessionErrorMsg ? "OFFLINE" : sessionLoading ? "LINKING…" : "CHANNEL OPEN"}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {sessionLoading && <p style={{ color: "var(--muted)" }}>连接中…</p>}
        {sessionErrorMsg && (
          <div className="space-y-2">
            <p style={{ color: "var(--tele-critical)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{sessionErrorMsg}</p>
            <button
              type="button"
              onClick={() => void refetchSession()}
              className="text-sm px-2 py-1 rounded-md border transition-interactive shell-btn"
              style={{ borderColor: "var(--border)" }}
            >
              重试
            </button>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[90%] p-2.5 transition-interactive font-body ${m.role === "user" ? "ml-auto" : ""}`}
            style={{
              background: m.role === "user" ? "var(--accent)" : "var(--panel-raised)",
              color: m.role === "user" ? "var(--on-accent)" : "var(--fg)",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
              opacity: m.id.startsWith("pending-") ? 0.7 : 1,
              borderRadius: "var(--radius-md)",
              fontWeight: m.role === "user" ? "var(--font-medium)" : "var(--font-normal)",
              lineHeight: 1.5,
            }}
          >
            {m.content}
          </div>
        ))}
        {send.isPending && <p style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.78rem", letterSpacing: "0.06em" }}>PROCESSING…</p>}
        {send.error && <p style={{ color: "var(--tele-critical)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{(send.error as Error).message}</p>}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), onSend())}
          placeholder="向 AI CONSOLE 发送指令…"
          disabled={!sessionId || sessionLoading}
          className="flex-1 px-3 py-2 rounded-md border text-sm disabled:opacity-50 transition-interactive shell-input"
          style={{ borderColor: "var(--border)", background: "var(--bg-raised)", color: "var(--fg)" }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={send.isPending || !sessionId || sessionLoading}
          className="px-3 py-2 rounded-md text-sm disabled:opacity-50 transition-interactive shell-btn"
          style={{
            background: "var(--accent)",
            color: "var(--on-accent)",
            border: "1px solid var(--accent)",
            fontFamily: "var(--font-mono)",
            fontWeight: "var(--font-semibold)",
            letterSpacing: "0.06em",
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
