import { SkolaraLogo } from "@skolara/ui";
import type { ReactNode } from "react";

/** A centred full-page message: not found, something broke, wrong place. */
export function StatusPage({ code, title, body, children }: { code?: string; title: string; body: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-5 py-10 text-center dark:bg-slate-950">
      <SkolaraLogo size={32} />
      <div className="max-w-md">
        {code && <p className="text-sm font-extrabold tracking-widest text-brand-700 dark:text-brand-300">{code}</p>}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">{body}</p>
        {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </main>
  );
}

export const statusLink =
  "inline-flex h-12 items-center rounded-lg bg-brand-700 px-6 text-base font-bold text-white hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700";
