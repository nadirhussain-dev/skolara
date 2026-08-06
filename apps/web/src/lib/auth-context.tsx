"use client";

import type { User } from "@skolara/types";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient, clearSession, getStoredRefreshToken, getStoredUser, setStoredUser } from "./api-client";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Deliberately deferred to an effect (not a lazy useState initializer):
    // localStorage isn't available during SSR, so reading it eagerly would
    // return a different value on the server vs. the client's first render
    // and trigger a hydration mismatch. Running it post-mount keeps both
    // passes consistent at the cost of one extra render while isLoading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getStoredUser());
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: (nextUser: User) => {
        setStoredUser(nextUser);
        setUser(nextUser);
      },
      logout: () => {
        const refreshToken = getStoredRefreshToken();
        clearSession();
        setUser(null);
        router.push("/login");
        // Best-effort — the local session is already cleared either way, so
        // a failed/slow revoke call shouldn't block navigation.
        if (refreshToken) apiClient.auth.logout(refreshToken).catch(() => {});
      },
    }),
    [user, isLoading, router],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
