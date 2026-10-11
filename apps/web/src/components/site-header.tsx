import { SkolaraLogo } from "@skolara/ui";
import Link from "next/link";

const link = "inline-flex min-h-[2.75rem] items-center rounded-lg px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";

/** Top bar for the public marketing pages. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" aria-label="Skolara home" className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700">
          <SkolaraLogo size={32} />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link href="/pricing" className={link}>Pricing</Link>
          <Link href="/login" className={link}>Sign in</Link>
          <Link href="/signup" className="ms-1 inline-flex min-h-[2.75rem] items-center rounded-lg bg-brand-700 px-4 text-sm font-bold text-white hover:bg-brand-800">
            Start free trial
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-slate-600 dark:text-slate-400 sm:px-6">
        <SkolaraLogo size={24} />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/pricing" className="hover:underline">Pricing</Link>
          <Link href="/signup" className="hover:underline">Start free trial</Link>
          <Link href="/login" className="hover:underline">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
