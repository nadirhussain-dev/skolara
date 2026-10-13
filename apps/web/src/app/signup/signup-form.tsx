"use client";

import { ApiError, useRegisterSchool, useSubdomainAvailability } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { PLANS, TRIAL_DAYS, type SubscriptionPlan } from "@skolara/types";
import { Button, Input, cn } from "@skolara/ui";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthShell, PasswordInput } from "@/components/auth-shell";
import { Field } from "@/components/ui-kit";

/** Self-serve plans only. ENTERPRISE is quoted by sales. */
const SELF_SERVE_PLANS = ["BASIC", "STANDARD", "PREMIUM"] as const;
type SelfServePlan = (typeof SELF_SERVE_PLANS)[number];

/** Mirrors the server's rule so the form can explain itself before submitting. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

type Errors = Partial<Record<"name" | "code" | "firstName" | "lastName" | "email" | "password", string>>;

export function SignupForm({ initialPlan }: { initialPlan: SubscriptionPlan }) {
  const { t } = useTranslation();
  const register = useRegisterSchool();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [plan, setPlan] = useState<SelfServePlan>(
    (SELF_SERVE_PLANS as readonly string[]).includes(initialPlan) ? (initialPlan as SelfServePlan) : "STANDARD",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const availability = useSubdomainAvailability(code);
  const taken = availability.data?.available === false;

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = t("signup.nameRequired");
    if (code.length < 3) next.code = t("signup.addressShort");
    else if (taken) next.code = t("signup.addressTaken");
    if (!firstName.trim()) next.firstName = t("people.required");
    if (!lastName.trim()) next.lastName = t("people.required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = t("people.emailInvalid");
    if (password.length < 8) next.password = t("people.passwordShort");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    register.mutate({
      name: name.trim(),
      subdomain: code,
      plan,
      adminFirstName: firstName.trim(),
      adminLastName: lastName.trim(),
      adminEmail: email.trim().toLowerCase(),
      adminPassword: password,
      contactPhone: phone.trim() || undefined,
    });
  }

  if (register.isSuccess) {
    return (
      <AuthShell
        title={t("signup.submittedTitle")}
        footer={<Link href="/login" className="font-bold text-brand-700 hover:underline dark:text-brand-300">{t("auth.backToSignIn")}</Link>}
      >
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {t("signup.submittedBody", { school: register.data.name, email: email.trim().toLowerCase(), code: register.data.subdomain })}
        </p>
      </AuthShell>
    );
  }

  const failure = register.isError
    ? register.error instanceof ApiError && register.error.status === 429
      ? t("signup.tooMany")
      : register.error instanceof ApiError && register.error.status === 409
        ? t("signup.addressTaken")
        : t("signup.failed")
    : null;

  return (
    <AuthShell
      wide
      title={t("signup.title")}
      subtitle={t("signup.subtitle", { days: TRIAL_DAYS })}
      footer={
        <p>
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-bold text-brand-700 hover:underline dark:text-brand-300">{t("auth.signIn")}</Link>
        </p>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label={t("signup.schoolName")} error={errors.name}>
          {(props) => (
            <Input
              {...props}
              autoComplete="organization"
              maxLength={120}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Suggest a code from the name until the user edits it themselves.
                if (!codeTouched) setCode(slugify(e.target.value));
              }}
            />
          )}
        </Field>
        <Field
          label={t("auth.schoolCode")}
          error={errors.code ?? (taken ? t("signup.addressTaken") : null)}
          help={availability.isFetching ? t("signup.checking") : availability.data?.available ? `${t("signup.available")} · ${code}.skolara.app` : t("signup.addressHelp")}
        >
          {(props) => (
            <Input
              {...props}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={40}
              value={code}
              onChange={(e) => {
                setCodeTouched(true);
                setCode(slugify(e.target.value));
              }}
            />
          )}
        </Field>

        <fieldset>
          <legend className="mb-1 block text-sm font-bold text-slate-900 dark:text-slate-50">{t("signup.plan")}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SELF_SERVE_PLANS.map((key) => (
              <label
                key={key}
                className={cn(
                  "flex cursor-pointer flex-col rounded-xl border p-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-brand-700",
                  plan === key ? "border-brand-700 bg-brand-50 dark:bg-brand-900/40" : "border-slate-300 hover:border-slate-400 dark:border-slate-700",
                )}
              >
                <input type="radio" name="plan" value={key} checked={plan === key} onChange={() => setPlan(key)} className="sr-only" />
                <span className="font-extrabold text-slate-900 dark:text-slate-50">{PLANS[key].name}</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {t("signup.perMonth", { price: (PLANS[key].monthlyPricePkr ?? 0).toLocaleString("en-PK") })}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {t("pricing.upToStudents", { count: (PLANS[key].maxStudents ?? 0).toLocaleString("en-PK") })}
                </span>
              </label>
            ))}
          </div>
          <Link href="/pricing" className="mt-2 inline-block text-sm font-bold text-brand-700 hover:underline dark:text-brand-300">{t("pricing.comparePlans")}</Link>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("signup.yourFirstName")} error={errors.firstName}>
            {(props) => <Input {...props} autoComplete="given-name" maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
          </Field>
          <Field label={t("signup.yourLastName")} error={errors.lastName}>
            {(props) => <Input {...props} autoComplete="family-name" maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} />}
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("signup.email")} error={errors.email}>
            {(props) => <Input {...props} type="email" inputMode="email" autoComplete="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Field label={t("signup.phone")} optional>
            {(props) => <Input {...props} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </Field>
        </div>
        <Field label={t("signup.password")} error={errors.password} help={t("signup.passwordHint")}>
          {(props) => <PasswordInput {...props} autoComplete="new-password" value={password} onChange={setPassword} visible={visible} onToggle={() => setVisible((v) => !v)} />}
        </Field>

        {failure && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-800 dark:bg-red-950/50 dark:text-red-200">{failure}</p>}
        <Button type="submit" disabled={register.isPending} className="h-12 text-base">
          {register.isPending ? t("signup.creating") : t("signup.submit")}
        </Button>
      </form>
    </AuthShell>
  );
}
