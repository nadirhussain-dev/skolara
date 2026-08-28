import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { DevicePlatform } from "@skolara/types";
import { apiClient, setStoredPushToken } from "./api-client";

// Show alerts even while the app is foregrounded — an absence alert or a
// payment verification is worth interrupting for.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function currentPlatform(): DevicePlatform {
  if (Platform.OS === "ios") return "IOS";
  if (Platform.OS === "android") return "ANDROID";
  return "WEB";
}

/**
 * Asks for notification permission and registers this device's Expo push
 * token against the signed-in user. Safe to call on every launch — the API
 * upserts on the token, so re-registering just refreshes `lastSeenAt`.
 *
 * Returns the token so the caller can hand it to `unregisterPushToken` at
 * sign-out, and `null` whenever push isn't available (simulator, permission
 * denied, or no EAS project id configured yet).
 */
export async function registerPushToken(): Promise<string | null> {
  // Simulators and emulators can't receive push notifications at all.
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  const granted =
    existing.granted ||
    (existing.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined;
  if (!projectId) {
    console.warn(
      "[push] No EAS projectId in app.json (expo.extra.eas.projectId) — skipping push registration.",
    );
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Skolara",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiClient.devices.register({ token, platform: currentPlatform() });
    await setStoredPushToken(token);
    return token;
  } catch (error) {
    // Never block sign-in on a push failure.
    console.warn(`[push] Registration failed: ${String(error)}`);
    return null;
  }
}

/**
 * Detaches this device from the signed-out user so the next person to sign in
 * on the same handset doesn't inherit their notifications.
 */
export async function unregisterPushToken(token: string | null) {
  if (!token) return;
  try {
    await apiClient.devices.unregister(token);
  } catch {
    // Best-effort — the session is going away regardless.
  }
}
