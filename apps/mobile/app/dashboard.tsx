import { Link, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  apiClient,
  clearSession,
  getStoredPushToken,
  getStoredRefreshToken,
} from "@/lib/api-client";
import { useTranslation } from "@skolara/i18n";
import { LanguageToggle } from "@/lib/language-toggle";
import { unregisterPushToken } from "@/lib/push";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";
import { Button } from "@/lib/ui";

const links = [
  { href: "/payments/submit", labelKey: "payments.submitPayment", icon: "💳" },
  { href: "/results", labelKey: "dashboard.viewResults", icon: "📊" },
  { href: "/notices", labelKey: "dashboard.notices", icon: "📣" },
  { href: "/assignments/mine", labelKey: "dashboard.homework", icon: "📝" },
  { href: "/materials", labelKey: "dashboard.studyMaterials", icon: "📚" },
  { href: "/quizzes", labelKey: "dashboard.quizzes", icon: "🧠" },
  { href: "/live-classes", labelKey: "dashboard.liveClasses", icon: "🎥" },
  { href: "/performance", labelKey: "dashboard.performance", icon: "📈" },
  { href: "/transport", labelKey: "dashboard.busTracking", icon: "🚌" },
  { href: "/library", labelKey: "dashboard.library", icon: "📚" },
  { href: "/complaints", labelKey: "dashboard.complaints", icon: "🗣️" },
  { href: "/messages", labelKey: "dashboard.messages", icon: "💬" },
] as const;

export default function DashboardScreen() {
  const { t } = useTranslation();

  async function signOut() {
    const refreshToken = await getStoredRefreshToken();
    const pushToken = await getStoredPushToken();
    // Detach the device before clearing the session — the unregister call
    // needs the access token, and the next person to sign in on this handset
    // shouldn't inherit these notifications.
    await unregisterPushToken(pushToken);
    await clearSession();
    router.replace("/(auth)/login");
    // Best-effort — local session is already cleared either way.
    if (refreshToken) apiClient.auth.logout(refreshToken).catch(() => {});
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} asChild>
          <Pressable style={styles.card}>
            <Text style={styles.icon}>{link.icon}</Text>
            <Text style={styles.label}>{t(link.labelKey)}</Text>
          </Pressable>
        </Link>
      ))}
      <View style={styles.footer}>
        <LanguageToggle />
        <Button title={t("auth.signOut")} variant="ghost" onPress={signOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.slate[50] },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate[100],
    padding: spacing.lg,
    ...shadow.card,
  },
  icon: { fontSize: 22 },
  label: { ...typography.subheading, flex: 1 },
  footer: { alignItems: "center", marginTop: spacing.sm },
});
