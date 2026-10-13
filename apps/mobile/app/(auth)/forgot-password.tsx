import { useForgotPassword } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { router } from "expo-router";
import { useState } from "react";
import { palette, useTheme } from "@/lib/school-theme";
import { Button, Card, Field, Muted, ScreenScroll, Title, Txt } from "@/lib/ui";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { school } = useTheme();
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function submit() {
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(t("people.emailInvalid"));
      return;
    }
    setError(null);
    // The same answer whether or not the account exists, so this screen can't
    // be used to find out who has one.
    forgot.mutate({ email: address, subdomain: school?.subdomain }, { onSettled: () => setSentTo(address) });
  }

  if (sentTo) {
    return (
      <ScreenScroll>
        <Title>{t("mobileFamily.checkYourEmail")}</Title>
        <Card style={{ backgroundColor: palette.successBg, borderColor: palette.successBg }}>
          <Txt accessibilityLiveRegion="polite" style={{ color: "#064E3B" }}>{t("auth.resetLinkSent", { email: sentTo })}</Txt>
        </Card>
        <Button title={t("auth.backToSignIn")} variant="secondary" onPress={() => router.back()} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <Title>{t("auth.forgotPasswordTitle")}</Title>
      <Muted>{t("auth.forgotPasswordSubtitle")}</Muted>
      <Field
        label={t("auth.email")}
        error={error}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        maxLength={200}
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <Button title={t("auth.sendResetLink")} onPress={submit} loading={forgot.isPending} />
    </ScreenScroll>
  );
}
