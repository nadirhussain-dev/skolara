import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import type { AuthTokens } from "@skolara/types";
import { createApiClient } from "@skolara/api-client";

const TOKEN_KEY = "skolara_access_token";
const REFRESH_TOKEN_KEY = "skolara_refresh_token";
const PUSH_TOKEN_KEY = "skolara_push_token";

export async function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredAccessToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setStoredRefreshToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function getStoredPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

export async function setStoredPushToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

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
