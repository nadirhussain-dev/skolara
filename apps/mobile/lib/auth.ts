import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthResponse, RoleType } from "@skolara/types";
import { router, type Href } from "expo-router";
import {
  apiClient,
  clearSession,
  getStoredPushToken,
  getStoredRefreshToken,
  setStoredAccessToken,
  setStoredRefreshToken,
} from "./api-client";
import { registerPushToken, unregisterPushToken } from "./push";

const PROFILE_KEY = "skolara_profile";

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  role: RoleType;
}

/** The first screen for each role once signed in. */
export function homeRouteFor(role: RoleType | undefined): Href {
  if (role === "TEACHER") return "/(teacher)";
  if (role === "SCHOOL_ADMIN") return "/(admin)";
  if (role === "SUPER_ADMIN") return "/super-admin";
  return "/(family)";
}

/**
 * Stores the session after a successful sign-in. Tokens go to the device's
 * secure store; the name shown in greetings is not secret and goes to
 * ordinary storage.
 */
export async function startSession(result: AuthResponse): Promise<void> {
  await setStoredAccessToken(result.accessToken);
  await setStoredRefreshToken(result.refreshToken);
  const profile: Profile = {
    firstName: result.user.firstName,
    lastName: result.user.lastName,
    email: result.user.email,
    role: result.user.role,
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)).catch(() => undefined);
  // Needs the access token in place first: registering a device is an
  // authenticated call. A failure here must not block sign-in.
  await registerPushToken().catch(() => undefined);
}

export async function readProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Profile>;
    if (typeof value.firstName !== "string" || typeof value.lastName !== "string" || typeof value.email !== "string") return null;
    return value as Profile;
  } catch {
    return null;
  }
}

/** Signs out on this phone and tells the server to end the session. */
export async function signOut(): Promise<void> {
  const refreshToken = await getStoredRefreshToken();
  const pushToken = await getStoredPushToken();
  // Detach the device before clearing the session: the call needs the access
  // token, and the next person to sign in on this handset must not inherit
  // these notifications.
  await unregisterPushToken(pushToken).catch(() => undefined);
  await clearSession();
  await AsyncStorage.removeItem(PROFILE_KEY).catch(() => undefined);
  router.replace("/(auth)/login");
  // Best effort: the local session is already gone either way.
  if (refreshToken) apiClient.auth.logout(refreshToken).catch(() => undefined);
}
