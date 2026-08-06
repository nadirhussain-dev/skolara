import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/lib/ui";
import { colors, spacing, typography } from "@/lib/theme";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.mark}>
        <Text style={styles.markText}>S</Text>
      </View>
      <Text style={styles.title}>Skolara</Text>
      <Text style={styles.subtitle}>Teacher &amp; parent app</Text>
      <Button
        title="Sign in"
        onPress={() => router.push("/(auth)/login")}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.brand[700],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  markText: { color: colors.white, fontSize: 30, fontWeight: "800" },
  title: { ...typography.title },
  subtitle: { ...typography.body, color: colors.slate[500], marginBottom: spacing.md },
  button: { minWidth: 160, marginTop: spacing.sm },
});
