import { TRIAL_DAYS } from "@skolara/types";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Skolara · The school office, in one place",
  description: "Fees, attendance, results, family messages and school finance in one app, in your school's own colours.",
};

const LOOPS = [
  { title: "Fees that collect themselves", body: "Bill a class in one step. Parents pay by bank transfer and upload the receipt in the app. You confirm it against the bank with one key." },
  { title: "Attendance before first period ends", body: "Teachers mark the register on their phone, even without signal. The office sees which classes are missing and parents of absent pupils are told." },
  { title: "Results without spreadsheets", body: "Enter a class mark sheet per subject, see the ranking, and produce every report card as a PDF with one button." },
  { title: "One place to talk to families", body: "Notices reach parents, students and teachers inside the app. No SMS bills, no WhatsApp groups to manage." },
  { title: "A budget the owner can read", body: "Set a monthly budget, record expenses, approve the ones that go over, and hand over a statement at month end." },
  { title: "Your school, not ours", body: "Families enter your school code and the app opens in your name, your logo and your colour, in English or Urdu." },
];

const STEPS = [
  { n: "1", title: "Create your school", body: "Pick a school code and a plan. It takes about two minutes." },
  { n: "2", title: "Add classes and people", body: "Add classes, teachers and students. Invite parents and link them to their children." },
  { n: "3", title: "Run the school day", body: "Take attendance, bill fees and send your first notice the same afternoon." },
];

/** A static picture of the admin home page, built from the same visual language. */
function ProductPreview() {
  const stat = "rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900";
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl shadow-brand-900/10 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex">
        <div className="hidden w-36 shrink-0 flex-col gap-1.5 bg-brand-900 p-3 sm:flex">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[0.6rem] font-extrabold text-brand-700">GV</span>
            <span className="text-[0.65rem] font-extrabold text-white">Green Valley</span>
          </div>
          {["Overview", "Students", "Fees", "Attendance", "Results", "Notices", "Finance"].map((item, i) => (
            <span key={item} className={`rounded-md px-2 py-1.5 text-[0.65rem] font-bold ${i === 0 ? "bg-white/15 text-white" : "text-white/75"}`}>{item}</span>
          ))}
        </div>
        <div className="flex-1 p-4">
          <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Good morning, Nadir</p>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[["Present today", "93%"], ["Collected", "Rs 2.3M"], ["To verify", "12"], ["Not marked", "2"]].map(([label, value]) => (
              <div key={label} className={stat}>
                <p className="text-[0.6rem] font-bold text-slate-600 dark:text-slate-400">{label}</p>
                <p className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
              </div>
            ))}
          </div>
          <div className={`${stat} mt-2`}>
            <p className="text-[0.7rem] font-extrabold text-slate-900 dark:text-slate-50">Needs your action</p>
            {[["bg-accent-500", "12 payments to verify", "Rs 148,500 waiting"], ["bg-red-700", "2 classes not marked", "5-A, 8-B"], ["bg-brand-700", "3 leave requests", "Waiting for a decision"]].map(([dot, title, sub]) => (
              <div key={title} className="mt-2 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                <span className="flex-1">
                  <span className="block text-[0.7rem] font-bold text-slate-900 dark:text-slate-50">{title}</span>
                  <span className="block text-[0.6rem] text-slate-600 dark:text-slate-400">{sub}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-white dark:bg-slate-950">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="inline-block rounded-full bg-accent-100 px-3 py-1 text-xs font-extrabold text-[#78350F]">Built for schools in Pakistan</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
              The school office, in one place.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-700 dark:text-slate-300">
              Fees, attendance, results, messages to families and the school budget. One web app for the office, one mobile app for teachers and parents, all in your school&apos;s own colours.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="inline-flex h-12 items-center rounded-lg bg-brand-700 px-6 text-base font-bold text-white hover:bg-brand-800">
                Start {TRIAL_DAYS}-day free trial
              </Link>
              <Link href="/pricing" className="inline-flex h-12 items-center rounded-lg border border-brand-200 px-6 text-base font-bold text-brand-700 hover:bg-brand-50 dark:border-slate-700 dark:text-brand-300 dark:hover:bg-slate-900">
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No card needed. English and Urdu.</p>
          </div>
          <ProductPreview />
        </section>

        <section aria-labelledby="what" className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="what" className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Six jobs, done properly</h2>
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LOOPS.map((loop) => (
                <li key={loop.title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{loop.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{loop.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="how" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="how" className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Running by this afternoon</h2>
          <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-4">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-base font-extrabold text-white">{step.n}</span>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-brand-900">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-12 sm:px-6">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white">Try it with your own school</h2>
              <p className="mt-2 text-base text-white/80">Free for {TRIAL_DAYS} days. Keep your data if you stay.</p>
            </div>
            <Link href="/signup" className="inline-flex h-12 items-center rounded-lg bg-accent-500 px-6 text-base font-extrabold text-[#1E1B4B] hover:bg-accent-400">
              Start free trial
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
