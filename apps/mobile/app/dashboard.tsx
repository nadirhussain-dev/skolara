import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

const links = [
  { href: "/payments/submit", label: "Submit a fee payment" },
  { href: "/results", label: "View results" },
  { href: "/notices", label: "Notices" },
] as const;

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} style={styles.card}>
          {link.label}
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#3730A3",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: "#3730A3",
    fontWeight: "600",
  },
});
