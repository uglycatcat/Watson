import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { PinCodeInput } from "../components/auth/PinCodeInput";
import { SpaceBackdrop } from "../components/ui/SpaceBackdrop";

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
    <div className="login-page">
      <SpaceBackdrop tone="night" />

      <header className="login-page__rail">
        <span className="login-page__rail-mark">WATSON</span>
        <span className="login-page__rail-sep" aria-hidden />
        <span className="login-page__rail-meta">PERSONAL OPERATIONS</span>
      </header>

      <main className="login-page__stage">
        <div className="login-page__brand">
          <p className="login-page__eyebrow">MISSION ACCESS</p>
          <h1 className="login-page__title">WATSON</h1>
          <div className="login-page__rule" aria-hidden />
          <p className="login-page__lede">Enter your authorization code to continue.</p>
        </div>

        <div className="login-page__auth">
          <label className="login-page__auth-label" htmlFor="login-pin-input">
            Access code
          </label>
          <PinCodeInput
            onComplete={onComplete}
            failed={failed}
            onClearFailure={() => setFailed(false)}
            disabled={submitting}
          />
          <p className="login-page__auth-hint" role="status">
            {failed ? "Code rejected — try again" : submitting ? "Verifying…" : "Four characters"}
          </p>
        </div>
      </main>

      <footer className="login-page__foot">
        <span>SYSTEM NOMINAL</span>
        <span className="login-page__foot-dot" aria-hidden />
        <span>SECURE CHANNEL</span>
      </footer>
    </div>
  );
}
