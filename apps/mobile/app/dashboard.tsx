import { Link, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiClient, clearSession, getStoredRefreshToken } from "@/lib/api-client";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";
import { Button } from "@/lib/ui";

const links = [
  { href: "/payments/submit", label: "Submit a fee payment", icon: "💳" },
  { href: "/results", label: "View results", icon: "📊" },
  { href: "/notices", label: "Notices", icon: "📣" },
  { href: "/assignments/mine", label: "Homework & assignments", icon: "📝" },
  { href: "/transport", label: "Bus tracking", icon: "🚌" },
  { href: "/library", label: "Library", icon: "📚" },
  { href: "/complaints", label: "Complaints", icon: "🗣️" },
  { href: "/messages", label: "Messages", icon: "💬" },
] as const;

export default function DashboardScreen() {
  async function signOut() {
    const refreshToken = await getStoredRefreshToken();
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
            <Text style={styles.label}>{link.label}</Text>
          </Pressable>
        </Link>
      ))}
      <View style={styles.footer}>
        <Button title="Sign out" variant="ghost" onPress={signOut} />
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
