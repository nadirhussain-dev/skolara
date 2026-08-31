import { PLANS, PLAN_ORDER, TRIAL_DAYS } from "@skolara/types";
import { Card } from "@skolara/ui";
import Link from "next/link";

export const metadata = {
  title: "Pricing — Skolara",
  description: "Transparent per-month pricing for schools. No demo required.",
};

function formatPrice(pricePkr: number | null): string {
  if (pricePkr === null) return "Let's talk";
  return `Rs. ${pricePkr.toLocaleString("en-PK")}`;
}

export default function PricingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="bg-brand-gradient bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Simple, published pricing
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
            Every plan starts with a {TRIAL_DAYS}-day free trial. No demo call, no
            &ldquo;contact us for a quote&rdquo; — sign up and set your school up today.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((planKey) => {
            const plan = PLANS[planKey];
            const isFeatured = plan.plan === "STANDARD";
            return (
              <Card
                key={plan.plan}
                className={
                  isFeatured
                    ? "relative border-brand-500 ring-1 ring-brand-500"
                    : "relative"
                }
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-4 rounded-full bg-brand-gradient px-3 py-0.5 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h2 className="text-lg font-bold">{plan.name}</h2>
                <p className="mt-1 min-h-[2.5rem] text-sm text-slate-500">{plan.tagline}</p>

                <p className="mt-4 text-3xl font-bold">
                  {formatPrice(plan.monthlyPricePkr)}
                  {plan.monthlyPricePkr !== null && (
                    <span className="text-sm font-normal text-slate-500"> / month</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {plan.maxStudents
                    ? `Up to ${plan.maxStudents.toLocaleString("en-PK")} students`
                    : "Unlimited students"}
                </p>

                <ul className="mt-5 flex flex-col gap-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden className="text-brand-600">
                        ✓
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={
                    plan.monthlyPricePkr === null
                      ? "mailto:sales@skolara.app"
                      : `/signup?plan=${plan.plan}`
                  }
                  className="mt-6 block rounded-lg bg-brand-gradient px-4 py-2 text-center text-sm font-semibold text-white"
                >
                  {plan.monthlyPricePkr === null ? "Contact sales" : "Start free trial"}
                </Link>
              </Card>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
