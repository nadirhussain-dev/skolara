import { Card } from "@skolara/ui";

export default function MobileOnlyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-sm text-center">
        <h1 className="mb-2 text-lg font-semibold text-brand-700">
          Use the Skolara app
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Student and parent accounts are designed for the Skolara mobile app —
          attendance, results, fee payment, and messaging all live there.
        </p>
      </Card>
    </main>
  );
}
