import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { api } from "./api";

interface AuthContextValue {
  isAdmin: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return document.cookie.includes("admin_token");
  });

  const login = useCallback(async (password: string) => {
    await api.admin.login(password);
    setIsAdmin(true);
  }, []);

  const logout = useCallback(async () => {
    await api.admin.logout();
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
