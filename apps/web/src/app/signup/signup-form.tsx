"use client";

import { useRegisterSchool, useSubdomainAvailability } from "@skolara/api-client";
import { PLANS, TRIAL_DAYS, type SubscriptionPlan } from "@skolara/types";
import { Button, Card, Input, Select } from "@skolara/ui";
import Link from "next/link";
import { useState } from "react";

/** Self-serve plans only — ENTERPRISE is quoted by sales. */
const SELF_SERVE_PLANS: SubscriptionPlan[] = ["BASIC", "STANDARD", "PREMIUM"];

/** Mirrors the server's rule so the form can explain itself before submitting. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function SignupForm({ initialPlan }: { initialPlan: SubscriptionPlan }) {
  const register = useRegisterSchool();

  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [plan, setPlan] = useState<SubscriptionPlan>(initialPlan);
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const availability = useSubdomainAvailability(subdomain);
  const isTaken = availability.data?.available === false;

  function handleNameChange(value: string) {
    setName(value);
    // Suggest a subdomain from the school name until the user edits it
    // themselves — then stop overwriting their choice.
    if (!subdomainTouched) setSubdomain(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await register.mutateAsync({
      name,
      subdomain,
      plan: plan as "BASIC" | "STANDARD" | "PREMIUM",
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      contactPhone: contactPhone || undefined,
    });
  }

  if (register.isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-bold">You&apos;re on the list</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">{register.data.name}</span> has been submitted
            for approval. We review new schools by hand — usually within a working day —
            and you&apos;ll get an email at{" "}
            <span className="font-medium">{adminEmail}</span> the moment your trial is
            live at{" "}
            <span className="font-medium">{register.data.subdomain}.skolara.app</span>.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-brand-700 hover:underline"
          >
            Back to sign in
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-3xl"
      />

      <Card className="relative w-full max-w-lg">
        <h1 className="text-xl font-bold">Set up your school</h1>
        <p className="mt-1 text-sm text-slate-500">
          Free for {TRIAL_DAYS} days. No card needed to start.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            School name
            <Input
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Beaconhouse Multan Campus"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Your address on Skolara
            <div className="flex items-center gap-2">
              <Input
                required
                value={subdomain}
                onChange={(e) => {
                  setSubdomainTouched(true);
                  setSubdomain(slugify(e.target.value));
                }}
                placeholder="beaconhouse-multan"
              />
              <span className="shrink-0 text-sm text-slate-500">.skolara.app</span>
            </div>
            {isTaken && (
              <span className="text-xs text-rose-600">
                That address is already taken — try another.
              </span>
            )}
            {availability.data?.available && (
              <span className="text-xs text-emerald-600">Available</span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Plan
            <Select
              value={plan}
              onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}
            >
              {SELF_SERVE_PLANS.map((planKey) => (
                <option key={planKey} value={planKey}>
                  {PLANS[planKey].name} — Rs.{" "}
                  {PLANS[planKey].monthlyPricePkr?.toLocaleString("en-PK")}/month
                </option>
              ))}
            </Select>
            <Link href="/pricing" className="text-xs text-brand-700 hover:underline">
              Compare plans
            </Link>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Your first name
              <Input
                required
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Your last name
              <Input
                required
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Email
            <Input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Phone (optional)
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+92 300 1234567"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Password
            <Input
              type="password"
              required
              minLength={8}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <span className="text-xs text-slate-400">At least 8 characters.</span>
          </label>

          {register.isError && (
            <p className="text-sm text-rose-600">
              {register.error instanceof Error
                ? register.error.message
                : "Something went wrong. Please try again."}
            </p>
          )}

          <Button type="submit" disabled={register.isPending || isTaken}>
            {register.isPending ? "Creating your school..." : "Start free trial"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
