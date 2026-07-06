import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";

/** 当前浏览器标签页内已通过验证码；关闭标签页后需重新输入 */
const PIN_VERIFIED_KEY = "watson:pinVerified";

function isPinVerifiedInTab(): boolean {
  try {
    return sessionStorage.getItem(PIN_VERIFIED_KEY) === "1";
  } catch {
    return false;
  }
}

function markPinVerified(): void {
  try {
    sessionStorage.setItem(PIN_VERIFIED_KEY, "1");
  } catch {
    /* ignore */
  }
}

function clearPinVerified(): void {
  try {
    sessionStorage.removeItem(PIN_VERIFIED_KEY);
  } catch {
    /* ignore */
  }
}

interface AuthContextValue {
  authenticated: boolean | null;
  error: string | null;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!isPinVerifiedInTab()) {
      setAuthenticated(false);
      return;
    }
    try {
      await api.me();
      setAuthenticated(true);
    } catch {
      clearPinVerified();
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const login = async (code: string) => {
    setError(null);
    try {
      await api.login(code);
      markPinVerified();
      setAuthenticated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "验证失败");
      setAuthenticated(false);
      throw e;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      clearPinVerified();
      setAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ authenticated, error, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
