"use client";

import { useForgotPassword } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Card, Input } from "@skolara/ui";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  /** Resolved from the request host by middleware; null on the platform domain. */
  hostSubdomain,
}: {
  hostSubdomain: string | null;
}) {
  const forgotPassword = useForgotPassword();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [typedSubdomain, setTypedSubdomain] = useState("");
  // On acme.skolara.app the school is already known from the URL.
  const subdomain = hostSubdomain ?? typedSubdomain;
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await forgotPassword.mutateAsync({ email, subdomain: subdomain || undefined });
    setSubmitted(true);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-10rem] right-[-6rem] h-80 w-80 rounded-full bg-coral-gradient opacity-20 blur-3xl"
      />

      <Card className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-xl font-bold text-white shadow-glow">
            S
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {t("auth.forgotPasswordTitle")}
            </h1>
            <p className="text-sm text-slate-500">{t("auth.forgotPasswordSubtitle")}</p>
          </div>
        </div>

        {submitted ? (
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t("auth.resetLinkSent", { email })}
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm text-brand-700 hover:underline">
              {t("auth.backToSignIn")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!hostSubdomain && (
              <Input
                type="text"
                placeholder={`${t("auth.schoolSubdomain")} (${t("common.optional")})`}
                value={typedSubdomain}
                onChange={(e) => setTypedSubdomain(e.target.value)}
              />
            )}
            <Input
              type="email"
              placeholder={t("auth.email")}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {forgotPassword.isError && (
              <p className="text-sm text-red-600">{t("common.somethingWentWrong")}</p>
            )}
            <Button type="submit" disabled={forgotPassword.isPending}>
              {forgotPassword.isPending ? t("auth.sending") : t("auth.sendResetLink")}
            </Button>
            <Link href="/login" className="text-center text-sm text-slate-500 hover:underline">
              {t("auth.backToSignIn")}
            </Link>
          </form>
        )}
      </Card>
    </main>
  );
}
