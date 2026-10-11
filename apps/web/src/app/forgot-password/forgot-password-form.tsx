"use client";

import { useForgotPassword } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Input } from "@skolara/ui";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Field } from "@/components/ui-kit";

export function ForgotPasswordForm({
  /** Resolved from the request host by middleware; null on the platform domain. */
  hostSubdomain,
}: {
  hostSubdomain: string | null;
}) {
  const forgot = useForgotPassword();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [typedCode, setTypedCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // On acme.skolara.app the school is already known from the URL.
  const code = (hostSubdomain ?? typedCode).trim().toLowerCase();

  function submit(event: FormEvent) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(t("people.emailInvalid"));
      return;
    }
    setError(null);
    // The answer is the same whether or not the account exists, so nobody can
    // use this form to find out who has an account.
    forgot.mutate({ email: address, subdomain: code || undefined }, { onSettled: () => setSentTo(address) });
  }

  const back = (
    <Link href="/login" className="font-bold text-brand-700 hover:underline dark:text-brand-300">{t("auth.backToSignIn")}</Link>
  );

  return (
    <AuthShell title={t("auth.forgotPasswordTitle")} subtitle={sentTo ? undefined : t("auth.forgotPasswordSubtitle")} footer={back}>
      {sentTo ? (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {t("auth.resetLinkSent", { email: sentTo })}
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {!hostSubdomain && (
            <Field label={t("auth.schoolCode")} help={t("auth.schoolCodeHelp")}>
              {(props) => <Input {...props} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={40} value={typedCode} onChange={(e) => setTypedCode(e.target.value.replace(/\s+/g, ""))} />}
            </Field>
          )}
          <Field label={t("auth.email")} error={error}>
            {(props) => <Input {...props} type="email" inputMode="email" autoComplete="username" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Button type="submit" disabled={forgot.isPending} className="h-12 text-base">
            {forgot.isPending ? t("auth.sending") : t("auth.sendResetLink")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
