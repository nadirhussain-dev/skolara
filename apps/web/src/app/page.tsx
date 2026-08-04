import Link from "next/link";
import { Button } from "@skolara/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold text-brand-700">Skolara</h1>
      <p className="max-w-md text-slate-600 dark:text-slate-400">
        A modern, AI-assisted school management platform.
      </p>
      <Link href="/login">
        <Button>Sign in</Button>
      </Link>
    </main>
  );
}
