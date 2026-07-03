import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ChatMessage } from "../../lib/api";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    api.createChatSession().then((s) => setSessionId(s.id));
  }, []);

  const { data: history } = useQuery({
    queryKey: ["chat", sessionId],
    queryFn: () => api.getChatMessages(sessionId!),
    enabled: !!sessionId,
  });

  const send = useMutation({
    mutationFn: (content: string) => api.sendChatMessage(sessionId!, content),
    onSuccess: (res) => {
      if (res.affectedCards.length) {
        qc.invalidateQueries({ queryKey: ["cards"] });
      }
      qc.invalidateQueries({ queryKey: ["chat", sessionId] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, send.data]);

  const messages: ChatMessage[] = history?.items ?? [];
  if (send.data?.message) {
    const last = messages[messages.length - 1];
    if (!last || last.id !== send.data.message.id) {
      messages.push(send.data.message);
    }
  }

  const onSend = () => {
    const text = input.trim();
    if (!text || !sessionId || send.isPending) return;
    setInput("");
    send.mutate(text);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b font-medium text-sm" style={{ borderColor: "var(--border)" }}>
        AI 助手
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[90%] p-2 rounded ${m.role === "user" ? "ml-auto" : ""}`}
            style={{
              background: m.role === "user" ? "var(--accent)" : "var(--bg)",
              color: m.role === "user" ? "#fff" : "var(--fg)",
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
          placeholder="用自然语言管理日程…"
          className="flex-1 px-3 py-2 rounded border text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={send.isPending || !sessionId}
          className="px-3 py-2 rounded text-white text-sm disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
