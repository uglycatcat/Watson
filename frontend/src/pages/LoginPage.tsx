import { Navigate } from "react-router-dom";
import { FormEvent, useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login, error, authenticated } = useAuth();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  if (authenticated) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(token.trim());
    } catch {
      /* handled in hook */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md p-8 rounded-lg border shadow-sm"
        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
      >
        <h1 className="text-2xl font-semibold mb-2">Watson</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          粘贴部署时生成的访问令牌以登录
        </p>
        <label className="block text-sm mb-2">访问令牌</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full px-3 py-2 rounded border mb-4 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" }}
          placeholder="Bearer token..."
          autoComplete="off"
        />
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="w-full py-2 rounded text-white text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "验证中…" : "进入 Watson"}
        </button>
      </form>
    </div>
  );
}
