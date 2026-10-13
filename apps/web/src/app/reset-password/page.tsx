"use client";

import { useResetPassword } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button } from "@skolara/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { AuthShell, PasswordInput } from "@/components/auth-shell";
import { Field } from "@/components/ui-kit";

function ResetPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [done, setDone] = useState(false);

  const requestNew = (
    <Link href="/forgot-password" className="font-bold text-brand-700 hover:underline dark:text-brand-300">{t("auth.resetRequestNew")}</Link>
  );

  if (!token) {
    return (
      <AuthShell title={t("auth.resetTitle")} footer={requestNew}>
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-800 dark:bg-red-950/50 dark:text-red-200">{t("auth.resetMissing")}</p>
      </AuthShell>
    );
  }
  if (done) {
    return (
      <AuthShell title={t("auth.resetTitle")}>
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{t("auth.resetDone")}</p>
        <Button className="mt-4 h-12 w-full text-base" onClick={() => router.push("/login")}>{t("auth.resetGoToSignIn")}</Button>
      </AuthShell>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (password.length < 8) next.password = t("people.passwordShort");
    if (confirm !== password) next.confirm = t("auth.resetMismatch");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    reset.mutate({ token, newPassword: password }, { onSuccess: () => setDone(true) });
  }

  return (
    <AuthShell title={t("auth.resetTitle")} subtitle={t("auth.resetSubtitle")} footer={requestNew}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label={t("auth.newPassword")} error={errors.password}>
          {(props) => <PasswordInput {...props} autoComplete="new-password" value={password} onChange={setPassword} visible={visible} onToggle={() => setVisible((v) => !v)} />}
        </Field>
        <Field label={t("auth.confirmPassword")} error={errors.confirm}>
          {(props) => <PasswordInput {...props} autoComplete="new-password" value={confirm} onChange={setConfirm} visible={visible} onToggle={() => setVisible((v) => !v)} />}
        </Field>
        {reset.isError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-800 dark:bg-red-950/50 dark:text-red-200">{t("auth.resetInvalid")}</p>}
        <Button type="submit" disabled={reset.isPending} className="h-12 text-base">{reset.isPending ? t("common.saving") : t("auth.resetSave")}</Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}
