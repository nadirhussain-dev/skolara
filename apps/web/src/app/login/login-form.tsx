"use client";

import { ApiError, isSchoolCode, useLogin, usePublicSchool } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Input } from "@skolara/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthShell, PasswordInput } from "@/components/auth-shell";
import { Field } from "@/components/ui-kit";
import { setStoredAccessToken, setStoredRefreshToken } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/super-admin/schools",
  SCHOOL_ADMIN: "/school",
  TEACHER: "/school/exams",
};

/** Waits for typing to pause so the school lookup is not fired on every key. */
function useDebounced(value: string, delay = 400): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

export function LoginForm({
  /** Resolved from the request host by middleware; null on the platform domain. */
  hostSubdomain,
}: {
  hostSubdomain: string | null;
}) {
  const router = useRouter();
  const login = useLogin();
  const auth = useAuth();
  const { t } = useTranslation();
  const [typedCode, setTypedCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Arriving on acme.skolara.app already says which school this is. Asking
  // again would be redundant, and letting it be overridden would make the
  // URL lie about which tenant is being signed into.
  const code = (hostSubdomain ?? typedCode).trim().toLowerCase();
  const lookedUp = useDebounced(code);
  const school = usePublicSchool(lookedUp);
  const found = lookedUp === code ? (school.data ?? null) : null;
  const notFound = lookedUp === code && isSchoolCode(code) && school.isError;

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = t("auth.emailRequired");
    if (!password) next.password = t("auth.passwordRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    login.mutate(
      { email: email.trim().toLowerCase(), password, subdomain: code || undefined },
      {
        onSuccess: (result) => {
          setStoredAccessToken(result.accessToken);
          setStoredRefreshToken(result.refreshToken);
          auth.login(result.user);
          router.push(ROLE_HOME[result.user.role] ?? "/mobile-only");
        },
      },
    );
  }

  const tooMany = login.error instanceof ApiError && login.error.status === 429;

  return (
    <AuthShell
      school={found}
      title={found ? t("auth.schoolFound", { school: found.name }) : t("auth.welcomeBack")}
      subtitle={found ? undefined : t("auth.signInSubtitle")}
      footer={
        <p>
          {t("auth.newHere")}{" "}
          <Link href="/signup" className="font-bold text-brand-700 hover:underline dark:text-brand-300">{t("auth.startTrial")}</Link>
        </p>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {!hostSubdomain && (
          <Field
            label={t("auth.schoolCode")}
            error={notFound ? t("auth.schoolCodeNotFound") : null}
            help={school.isFetching ? t("auth.schoolCodeChecking") : t("auth.schoolCodeHelp")}
          >
            {(props) => (
              <Input
                {...props}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="organization"
                maxLength={40}
                value={typedCode}
                onChange={(e) => setTypedCode(e.target.value.replace(/\s+/g, ""))}
              />
            )}
          </Field>
        )}
        <Field label={t("auth.email")} error={errors.email}>
          {(props) => <Input {...props} type="email" inputMode="email" autoComplete="username" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label={t("auth.password")} error={errors.password}>
          {(props) => <PasswordInput {...props} autoComplete="current-password" value={password} onChange={setPassword} visible={visible} onToggle={() => setVisible((v) => !v)} />}
        </Field>
        {login.isError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-800 dark:bg-red-950/50 dark:text-red-200">
            {tooMany ? t("auth.tooManyAttempts") : t("auth.invalidCredentials")}
          </p>
        )}
        <Button type="submit" disabled={login.isPending} className="mt-1 h-12 text-base">
          {login.isPending ? t("auth.signingIn") : t("auth.signIn")}
        </Button>
        <Link href="/forgot-password" className="self-start text-sm font-bold text-brand-700 hover:underline dark:text-brand-300">
          {t("auth.forgotPassword")}
        </Link>
      </form>
    </AuthShell>
  );
}
