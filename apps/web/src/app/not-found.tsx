import { Button, Card } from "@skolara/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <p className="bg-brand-gradient bg-clip-text text-4xl font-extrabold text-transparent">
          404
        </p>
        <h1 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/">
            <Button>Go home</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
