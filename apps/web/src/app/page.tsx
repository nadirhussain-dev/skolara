import Link from "next/link";
import { Button } from "@skolara/ui";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden px-4 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-8rem] right-[-6rem] h-96 w-96 rounded-full bg-coral-gradient opacity-20 blur-3xl"
      />

      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-3xl font-bold text-white shadow-glow">
        S
      </span>
      <h1 className="bg-brand-gradient bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
        Skolara
      </h1>
      <p className="max-w-md text-lg text-slate-600 dark:text-slate-400">
        A modern, AI-assisted school management platform — fees, attendance, gradebook, and
        parent communication in one place.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/signup">
          <Button className="px-8 py-3 text-base">Start free trial</Button>
        </Link>
        <Link href="/pricing">
          <Button variant="secondary" className="px-8 py-3 text-base">
            See pricing
          </Button>
        </Link>
      </div>
      <Link href="/login" className="text-sm text-brand-700 hover:underline">
        Already have an account? Sign in
      </Link>
    </main>
  );
}
