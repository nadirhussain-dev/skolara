import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthTokens } from "@skolara/types";
import { createApiClient } from "@skolara/api-client";

const TOKEN_KEY = "skolara_access_token";
const REFRESH_TOKEN_KEY = "skolara_refresh_token";
const PUSH_TOKEN_KEY = "skolara_push_token";

/**
 * Tokens live in the device's secure store. The browser build, which exists
 * only as a development preview, has no secure store, so it keeps them in
 * memory: nothing is written anywhere a script could read it back later, and
 * the session ends when the tab closes.
 */
const memory = new Map<string, string>();
const useMemory = Platform.OS === "web";

async function read(key: string): Promise<string | null> {
  if (useMemory) return memory.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string | null): Promise<void> {
  if (useMemory) {
    if (value) memory.set(key, value);
    else memory.delete(key);
    return;
  }
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}

export const getStoredAccessToken = () => read(TOKEN_KEY);
export const setStoredAccessToken = (token: string | null) => write(TOKEN_KEY, token);
export const getStoredRefreshToken = () => read(REFRESH_TOKEN_KEY);
export const setStoredRefreshToken = (token: string | null) => write(REFRESH_TOKEN_KEY, token);
export const getStoredPushToken = () => read(PUSH_TOKEN_KEY);
export const setStoredPushToken = (token: string | null) => write(PUSH_TOKEN_KEY, token);

export async function clearSession() {
  await setStoredAccessToken(null);
  await setStoredRefreshToken(null);
  await setStoredPushToken(null);
}

export const apiClient = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
  getAccessToken: getStoredAccessToken,
  getRefreshToken: getStoredRefreshToken,
  onTokensRefreshed: async (tokens: AuthTokens) => {
    await setStoredAccessToken(tokens.accessToken);
    await setStoredRefreshToken(tokens.refreshToken);
  },
  onAuthFailure: async () => {
    await clearSession();
    router.replace("/(auth)/login");
  },
});
