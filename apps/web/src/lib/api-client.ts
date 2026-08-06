import type { User } from "@skolara/types";
import { createApiClient } from "@skolara/api-client";

const TOKEN_STORAGE_KEY = "skolara_access_token";
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
  setStoredUser(null);
}

export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  getAccessToken: () => getStoredAccessToken(),
});
