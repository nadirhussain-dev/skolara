import { PLANS, PLAN_ORDER, TRIAL_DAYS } from "@skolara/types";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Pricing",
  description: "Published monthly pricing for schools. Every plan starts with a free trial.",
};

function formatPrice(pricePkr: number | null): string {
  return pricePkr === null ? "Let's talk" : `Rs ${pricePkr.toLocaleString("en-PK")}`;
}

export default function PricingPage() {
  return (
    <div className="bg-white dark:bg-slate-950">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Simple, published pricing</h1>
          <p className="mt-3 text-lg leading-relaxed text-slate-700 dark:text-slate-300">
            Every plan starts with a {TRIAL_DAYS}-day free trial. No demo call and no quote to wait for: sign up and set your school up today.
          </p>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            const featured = key === "STANDARD";
            const enterprise = plan.monthlyPricePkr === null;
            return (
              <li
                key={key}
                className={`flex flex-col rounded-2xl border bg-white p-6 dark:bg-slate-900 ${featured ? "border-brand-700 shadow-lg shadow-brand-900/10 ring-1 ring-brand-700" : "border-slate-200 dark:border-slate-700"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">{plan.name}</h2>
                  {featured && <span className="rounded-full bg-accent-500 px-2.5 py-1 text-xs font-extrabold text-[#1E1B4B]">Most popular</span>}
                </div>
                <p className="mt-1 min-h-[2.5rem] text-sm text-slate-600 dark:text-slate-400">{plan.tagline}</p>
                <p className="mt-4 text-3xl font-extrabold tabular-nums text-slate-900 dark:text-slate-50">
                  {formatPrice(plan.monthlyPricePkr)}
                  {!enterprise && <span className="text-sm font-semibold text-slate-600 dark:text-slate-400"> / month</span>}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {plan.maxStudents ? `Up to ${plan.maxStudents.toLocaleString("en-PK")} students` : "Unlimited students"}
                </p>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400"><path d="M5 12l5 5 9-10" /></svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={enterprise ? "mailto:sales@skolara.app" : `/signup?plan=${key}`}
                  className={`mt-6 inline-flex h-12 items-center justify-center rounded-lg px-4 text-sm font-bold ${featured ? "bg-brand-700 text-white hover:bg-brand-800" : "border border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-slate-700 dark:text-brand-300 dark:hover:bg-slate-800"}`}
                >
                  {enterprise ? "Contact sales" : "Start free trial"}
                  <span className="sr-only"> on {plan.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
