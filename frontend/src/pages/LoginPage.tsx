import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { PinCodeInput } from "../components/auth/PinCodeInput";

export function LoginPage() {
  const { login, authenticated } = useAuth();
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (authenticated) return <Navigate to="/" replace />;

  const onComplete = async (code: string) => {
    if (submitting) return;
    setSubmitting(true);
    setFailed(false);
    try {
      await login(code);
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black flex flex-col items-center justify-between px-4 py-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute top-[12%] left-[8%] w-32 h-px rotate-[-24deg]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
        />
        <div
          className="absolute top-[22%] right-[10%] w-24 h-px rotate-[18deg]"
          style={{ background: "rgba(255,255,255,0.2)" }}
        />
        <div
          className="absolute bottom-[32%] left-[14%] w-40 h-px rotate-[8deg]"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
        <div
          className="absolute bottom-[22%] right-[12%] w-28 h-px rotate-[-12deg]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)" }}
        />
        <div className="absolute top-[38%] left-[5%] w-px h-20 bg-white/10" />
        <div className="absolute top-[48%] right-[6%] w-px h-16 bg-white/12" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-lg flex-1 justify-center pt-8 pb-6">
        <h1
          className="text-[clamp(3rem,12vw,5.5rem)] font-black leading-none tracking-[0.14em] select-none mb-10"
          style={{
            color: "#76b900",
            textShadow: "0 0 32px rgba(118,185,0,0.2), 0 2px 12px rgba(0,0,0,0.4)",
          }}
        >
          WATSON
        </h1>

        <p className="text-sm mb-6 text-center" style={{ color: "rgba(255,255,255,0.55)" }}>
          请输入四字符验证码以登录
        </p>

        <PinCodeInput
          onComplete={onComplete}
          failed={failed}
          onClearFailure={() => setFailed(false)}
          disabled={submitting}
        />
      </div>

      <footer
        className="relative z-10 w-full max-w-lg flex flex-col items-center justify-end min-h-[72px] shrink-0"
        aria-label="备案信息预留"
      >
        <div
          className="w-full h-12 rounded-md border border-dashed flex items-center justify-center gap-3 px-3"
          style={{
            borderColor: "rgba(255,255,255,0.22)",
            color: "rgba(255,255,255,0.45)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <span
            className="inline-block w-7 h-7 rounded shrink-0"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-hidden
          />
          <span className="text-xs tracking-wide">备案信息预留</span>
        </div>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
