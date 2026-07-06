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
    <div className="min-h-screen relative overflow-hidden bg-black flex flex-col items-center px-4">
      {/* 白色线条点缀 */}
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
          className="absolute bottom-[28%] left-[14%] w-40 h-px rotate-[8deg]"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
        <div
          className="absolute bottom-[18%] right-[12%] w-28 h-px rotate-[-12deg]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)" }}
        />
        <div className="absolute top-[38%] left-[5%] w-px h-20 bg-white/10" />
        <div className="absolute top-[48%] right-[6%] w-px h-16 bg-white/12" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-lg pt-[14vh] sm:pt-[16vh]">
        <h1
          className="text-[clamp(3.5rem,14vw,6.5rem)] font-black leading-none tracking-[0.12em] select-none mb-12 sm:mb-16"
          style={{
            color: "#76b900",
            WebkitTextStroke: "4px #9333ea",
            paintOrder: "stroke fill",
            textShadow: "0 0 40px rgba(118,185,0,0.25)",
          }}
        >
          WATSON
        </h1>

        <PinCodeInput
          onComplete={onComplete}
          failed={failed}
          onClearFailure={() => setFailed(false)}
          disabled={submitting}
        />
      </div>

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
