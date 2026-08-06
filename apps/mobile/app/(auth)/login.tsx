import { useLogin } from "@skolara/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { setStoredAccessToken } from "@/lib/api-client";
import { colors, spacing, typography } from "@/lib/theme";
import { Button, Input } from "@/lib/ui";

export default function LoginScreen() {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subdomain, setSubdomain] = useState("");

  async function handleSubmit() {
    const result = await login.mutateAsync({
      email,
      password,
      subdomain: subdomain || undefined,
    });
    await setStoredAccessToken(result.accessToken);
    if (result.user.role === "TEACHER") {
      router.replace("/teacher-dashboard");
    } else {
      router.replace("/dashboard");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to your school account</Text>
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
      <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {login.isError && <Text style={styles.error}>Invalid credentials.</Text>}
      <Button
        title="Sign in"
        onPress={handleSubmit}
        loading={login.isPending}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.md, backgroundColor: colors.white },
  title: { ...typography.title, fontSize: 24 },
  subtitle: { ...typography.body, color: colors.slate[500], marginBottom: spacing.sm },
  button: { marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 13 },
});
