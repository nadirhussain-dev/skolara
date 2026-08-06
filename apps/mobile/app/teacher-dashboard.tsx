import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

const links = [
  { href: "/attendance", label: "Mark attendance", icon: "✅" },
  { href: "/assignments", label: "Homework & assignments", icon: "📝" },
  { href: "/payroll", label: "My payslips", icon: "💰" },
  { href: "/messages", label: "Messages", icon: "💬" },
] as const;

export default function TeacherDashboardScreen() {
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
