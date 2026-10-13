import { ApiError, isSchoolCode, useApiClient } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LanguageToggle } from "@/lib/language-toggle";
import { SkolaraMark } from "@/lib/logo";
import { palette, useTheme } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { Button, Field, Muted, Title, Txt } from "@/lib/ui";

/**
 * Step one on a new phone: which school is this? Finding the school loads
 * its name, logo and colour, and every screen after this one wears them.
 */
export default function SchoolCodeScreen() {
  const { t } = useTranslation();
  const api = useApiClient();
  const { setSchool, brand } = useTheme();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const value = code.trim().toLowerCase();
    if (!isSchoolCode(value)) {
      setError(t("app.codeTooShort"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setSchool(await api.schools.findPublic(value));
      router.replace("/(auth)/login");
    } catch (failure) {
      setError(failure instanceof ApiError && failure.status === 404 ? t("app.notFound") : t("app.offline"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SkolaraMark size={64} />
          <View style={{ gap: spacing.xs }}>
            <Title>{t("app.welcome")}</Title>
            <Muted style={{ fontSize: 16 }}>{t("app.schoolPrompt")}</Muted>
          </View>
          <Field
            label={t("auth.schoolCode")}
            help={busy ? t("app.checking") : t("app.schoolCodeHelp")}
            error={error}
            value={code}
            onChangeText={(text) => setCode(text.replace(/\s+/g, ""))}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            maxLength={40}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Button title={t("app.continue")} onPress={submit} loading={busy} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSchool(null);
              router.replace("/(auth)/login");
            }}
            style={styles.link}
          >
            <Txt style={{ color: brand[700], fontWeight: "700", textAlign: "center" }}>{t("app.staffNoCode")}</Txt>
          </Pressable>
          <View style={styles.language}><LanguageToggle /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.surface },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  link: { minHeight: 44, justifyContent: "center" },
  language: { alignItems: "center", marginTop: spacing.sm },
});
