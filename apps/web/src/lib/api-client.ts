import type { AuthTokens, User } from "@skolara/types";
import { createApiClient } from "@skolara/api-client";

const TOKEN_STORAGE_KEY = "skolara_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "skolara_refresh_token";
const USER_STORAGE_KEY = "skolara_user";

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setStoredRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_STORAGE_KEY);
}

export function clearSession() {
  setStoredAccessToken(null);
  setStoredRefreshToken(null);
  setStoredUser(null);
}

export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  getAccessToken: () => getStoredAccessToken(),
  getRefreshToken: () => getStoredRefreshToken(),
  onTokensRefreshed: (tokens: AuthTokens) => {
    setStoredAccessToken(tokens.accessToken);
    setStoredRefreshToken(tokens.refreshToken);
  },
  onAuthFailure: () => {
    clearSession();
    // Hard navigation is required, not just tolerated: this runs at module
    // scope in a plain fetch wrapper, outside any component, so there's no
    // useRouter() to call.
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }
  },
});
