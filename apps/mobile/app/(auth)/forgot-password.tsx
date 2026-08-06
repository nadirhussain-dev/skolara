import { useForgotPassword } from "@skolara/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";
import { Button, Input } from "@/lib/ui";

export default function ForgotPasswordScreen() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    await forgotPassword.mutateAsync({ email, subdomain: subdomain || undefined });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          If an account exists for {email}, a reset link is on its way. Open it on your phone
          or computer to set a new password.
        </Text>
        <Button title="Back to sign in" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot your password?</Text>
      <Text style={styles.subtitle}>We&apos;ll email you a link to set a new one.</Text>
      <Input
        placeholder="School subdomain (optional)"
        autoCapitalize="none"
        value={subdomain}
        onChangeText={setSubdomain}
      />
      <Input
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {forgotPassword.isError && (
        <Text style={styles.error}>Something went wrong. Please try again.</Text>
      )}
      <Button
        title="Send reset link"
        onPress={handleSubmit}
        loading={forgotPassword.isPending}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  title: { ...typography.title, fontSize: 24 },
  subtitle: { ...typography.body, color: colors.slate[500], marginBottom: spacing.sm },
  button: { marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 13 },
});
