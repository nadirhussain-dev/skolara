import { ApiError, useLogin } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { homeRouteFor, startSession } from "@/lib/auth";
import { LanguageToggle } from "@/lib/language-toggle";
import { SkolaraMark } from "@/lib/logo";
import { palette, useTheme } from "@/lib/school-theme";
import { radius, spacing } from "@/lib/theme";
import { Button, Field, Input, Txt } from "@/lib/ui";

/** Only http(s) logos are ever loaded. */
function safeLogo(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

/**
 * Sign-in, in the school's own colours once its code is known. A platform
 * administrator, who has no school, sees the Skolara default.
 */
export default function LoginScreen() {
  const login = useLogin();
  const { t } = useTranslation();
  const { school, brand, setSchool } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const logo = safeLogo(school?.logoUrl);
  const initials = (school?.name ?? "").split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

  function submit() {
    const next: typeof errors = {};
    if (!email.trim()) next.email = t("auth.emailRequired");
    if (!password) next.password = t("auth.passwordRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    login.mutate(
      { email: email.trim().toLowerCase(), password, subdomain: school?.subdomain },
      {
        onSuccess: async (result) => {
          await startSession(result);
          router.replace(homeRouteFor(result.user.role));
        },
      },
    );
  }

  const tooMany = login.error instanceof ApiError && login.error.status === 429;
  const offline = login.isError && !(login.error instanceof ApiError);

  return (
    <View style={{ flex: 1, backgroundColor: brand[900] }}>
      <SafeAreaView edges={["top", "left", "right"]}>
        <View style={styles.header}>
          {school ? (
            logo ? (
              <Image source={{ uri: logo }} style={styles.logo} accessibilityIgnoresInvertColors />
            ) : (
              <View style={[styles.logo, styles.initials]}>
                <Text style={{ color: brand[700], fontWeight: "800", fontSize: 22 }}>{initials}</Text>
              </View>
            )
          ) : (
            <SkolaraMark size={56} reversed />
          )}
          <Txt accessibilityRole="header" style={styles.headerTitle}>
            {school ? school.name : t("auth.welcomeBack")}
          </Txt>
          {school ? <Txt style={styles.headerSub}>{t("app.poweredBy")}</Txt> : <Txt style={styles.headerSub}>{t("auth.signInSubtitle")}</Txt>}
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Txt accessibilityRole="header" style={styles.formTitle}>
            {school ? t("app.signInTo", { school: school.name }) : t("auth.signIn")}
          </Txt>
          <Field
            label={t("auth.email")}
            error={errors.email}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            maxLength={200}
            returnKeyType="next"
          />
          <View style={{ gap: 6 }}>
            <Txt style={styles.label}>{t("auth.password")}</Txt>
            <View style={styles.passwordRow}>
              <Input
                accessibilityLabel={t("auth.password")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                maxLength={72}
                returnKeyType="go"
                onSubmitEditing={submit}
                style={[{ flex: 1 }, errors.password ? { borderColor: palette.danger } : null]}
              />
              <Pressable
                onPress={() => setVisible((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={visible ? t("auth.hidePassword") : t("auth.showPassword")}
                style={styles.reveal}
              >
                <Text style={{ color: brand[700], fontWeight: "700" }}>{visible ? t("app.hidePassword") : t("app.showPassword")}</Text>
              </Pressable>
            </View>
            {errors.password ? <Txt accessibilityLiveRegion="polite" style={styles.fieldError}>{errors.password}</Txt> : null}
          </View>
          {login.isError && (
            <View accessibilityRole="alert" style={styles.alert}>
              <Txt style={{ color: palette.danger, fontWeight: "700" }}>
                {tooMany ? t("auth.tooManyAttempts") : offline ? t("app.offline") : t("auth.invalidCredentials")}
              </Txt>
            </View>
          )}
          <Button title={t("auth.signIn")} onPress={submit} loading={login.isPending} />
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable accessibilityRole="link" style={styles.link}>
              <Text style={{ color: brand[700], fontWeight: "700" }}>{t("auth.forgotPassword")}</Text>
            </Pressable>
          </Link>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSchool(null);
              router.replace("/(auth)/school");
            }}
            style={styles.link}
          >
            <Text style={{ color: palette.muted, fontWeight: "600" }}>{school ? t("app.notYourSchool") : t("auth.schoolCode")}</Text>
          </Pressable>
          <View style={{ alignItems: "center" }}><LanguageToggle /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: "#FFFFFF" },
  initials: { alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", textAlign: "center" },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, textAlign: "center" },
  sheet: { flex: 1, backgroundColor: palette.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: "hidden" },
  form: { padding: spacing.xl, gap: spacing.lg },
  formTitle: { fontSize: 22, fontWeight: "800", color: palette.ink },
  label: { fontSize: 14, fontWeight: "700", color: palette.ink },
  fieldError: { fontSize: 14, fontWeight: "700", color: palette.danger },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reveal: { minHeight: 48, minWidth: 56, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center" },
  alert: { backgroundColor: palette.dangerBg, borderRadius: radius.md, padding: spacing.md },
  link: { minHeight: 44, alignItems: "center", justifyContent: "center" },
});
