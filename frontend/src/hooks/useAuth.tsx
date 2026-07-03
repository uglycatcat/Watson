import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";

interface AuthContextValue {
  authenticated: boolean | null;
  error: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      await api.me();
      setAuthenticated(true);
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const login = async (token: string) => {
    setError(null);
    try {
      await api.login(token);
      setAuthenticated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败");
      setAuthenticated(false);
      throw e;
    }
  };

  const logout = async () => {
    await api.logout();
    setAuthenticated(false);
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
