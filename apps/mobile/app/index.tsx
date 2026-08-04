import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Skolara</Text>
      <Text style={styles.subtitle}>Teacher &amp; parent app</Text>
      <Link href="/(auth)/login" style={styles.link}>
        Sign in
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: "600", color: "#3730A3" },
  subtitle: { color: "#64748B" },
  link: {
    marginTop: 12,
    color: "#fff",
    backgroundColor: "#3730A3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
});
