import { useForgotPassword } from "@skolara/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { colors, spacing, typography } from "@/lib/theme";
import { Button, Input } from "@/lib/ui";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
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
        <Text style={styles.title}>{t("mobileFamily.checkYourEmail")}</Text>
        <Text style={styles.subtitle}>{t("auth.resetLinkSent", { email })}</Text>
        <Button
          title={t("auth.backToSignIn")}
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("auth.forgotPasswordTitle")}</Text>
      <Text style={styles.subtitle}>{t("auth.forgotPasswordSubtitle")}</Text>
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
      {forgotPassword.isError && (
        <Text style={styles.error}>{t("common.somethingWentWrong")}</Text>
      )}
      <Button
        title={t("auth.sendResetLink")}
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
