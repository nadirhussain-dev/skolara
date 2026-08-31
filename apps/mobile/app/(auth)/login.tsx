import { useLogin } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { setStoredAccessToken, setStoredRefreshToken } from "@/lib/api-client";
import { registerPushToken } from "@/lib/push";
import { colors, spacing, typography } from "@/lib/theme";
import { LanguageToggle } from "@/lib/language-toggle";
import { Button, Input } from "@/lib/ui";

export default function LoginScreen() {
  const login = useLogin();
  const { t } = useTranslation();
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
    await setStoredRefreshToken(result.refreshToken);
    // Needs the access token in place first — the register call is authenticated.
    await registerPushToken();
    if (result.user.role === "TEACHER") {
      router.replace("/teacher-dashboard");
    } else {
      router.replace("/dashboard");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("auth.welcomeBack")}</Text>
      <Text style={styles.subtitle}>{t("auth.signInSubtitle")}</Text>
      <Input
        placeholder={`${t("auth.schoolSubdomain")} (${t("common.optional")})`}
        autoCapitalize="none"
        value={subdomain}
        onChangeText={setSubdomain}
      />
      <Input
        placeholder={t("auth.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input placeholder={t("auth.password")} secureTextEntry value={password} onChangeText={setPassword} />
      {login.isError && <Text style={styles.error}>{t("auth.invalidCredentials")}</Text>}
      <Button
        title={t("auth.signIn")}
        onPress={handleSubmit}
        loading={login.isPending}
        style={styles.button}
      />
      <Link href="/(auth)/forgot-password" asChild>
        <Pressable>
          <Text style={styles.link}>{t("auth.forgotPassword")}</Text>
        </Pressable>
      </Link>
      <LanguageToggle />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.md, backgroundColor: colors.white },
  title: { ...typography.title, fontSize: 24 },
  subtitle: { ...typography.body, color: colors.slate[500], marginBottom: spacing.sm },
  button: { marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 13 },
  link: { textAlign: "center", color: colors.brand[700], fontSize: 13, marginTop: spacing.sm },
});
