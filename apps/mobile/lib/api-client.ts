import * as SecureStore from "expo-secure-store";
import { createApiClient } from "@skolara/api-client";

const TOKEN_KEY = "skolara_access_token";

export async function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredAccessToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export const apiClient = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
  getAccessToken: getStoredAccessToken,
});
