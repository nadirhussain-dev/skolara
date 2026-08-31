"use client";

import { useLogin } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Card, Input } from "@skolara/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setStoredAccessToken, setStoredRefreshToken } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/super-admin/schools",
  SCHOOL_ADMIN: "/school/analytics",
  TEACHER: "/teacher/gradebook",
};

export function LoginForm({
  /** Resolved from the request host by middleware; null on the platform domain. */
  hostSubdomain,
}: {
  hostSubdomain: string | null;
}) {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [typedSubdomain, setTypedSubdomain] = useState("");

  const auth = useAuth();
  const { t } = useTranslation();
  // Arriving on acme.skolara.app already says which school this is — asking
  // again would be redundant, and letting it be overridden would make the
  // URL lie about which tenant is being signed into.
  const subdomain = hostSubdomain ?? typedSubdomain;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await login.mutateAsync({
      email,
      password,
      subdomain: subdomain || undefined,
    });
    setStoredAccessToken(result.accessToken);
    setStoredRefreshToken(result.refreshToken);
    auth.login(result.user);
    router.push(ROLE_HOME[result.user.role] ?? "/mobile-only");
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
              {t("auth.welcomeBack")}
            </h1>
            <p className="text-sm text-slate-500">
              {hostSubdomain
                ? t("auth.signInToSchool", { school: hostSubdomain })
                : t("auth.signInSubtitle")}
            </p>
          </div>
        </div>
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
          <Input
            type="password"
            placeholder={t("auth.password")}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {login.isError && (
            <p className="text-sm text-red-600">{t("auth.invalidCredentials")}</p>
          )}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/forgot-password" className="text-brand-700 hover:underline">
            {t("auth.forgotPassword")}
          </Link>
        </p>
      </Card>
    </main>
  );
}
