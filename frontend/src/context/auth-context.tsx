"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, post } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthStatus = "loading" | "authenticated" | "anonymous" | "unavailable";

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  /** Drops the local session when the server says it is no longer valid */
  sessionExpired: () => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const fetchSession = useCallback(
    () =>
      api<User>("/auth/me").then(
        (current) => {
          setUser(current);
          setStatus("authenticated");
        },
        (error) => {
          setUser(null);
          setStatus(error instanceof ApiError && error.isNetworkError ? "unavailable" : "anonymous");
        },
      ),
    [],
  );

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const signIn = useCallback((signedIn: User) => {
    setUser(signedIn);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login: async (email, password) => signIn(await post<User>("/auth/login", { email, password })),
      register: async (data) => signIn(await post<User>("/auth/register", data)),
      logout: async () => {
        try {
          await post("/auth/logout");
        } finally {
          signOut();
        }
      },
      sessionExpired: signOut,
      retry: () => {
        setStatus("loading");
        void fetchSession();
      },
    }),
    [user, status, fetchSession, signIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
