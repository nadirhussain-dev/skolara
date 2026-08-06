import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

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
  return (
    <View style={styles.container}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} asChild>
          <Pressable style={styles.card}>
            <Text style={styles.icon}>{link.icon}</Text>
            <Text style={styles.label}>{link.label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.slate[50] },
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
});
