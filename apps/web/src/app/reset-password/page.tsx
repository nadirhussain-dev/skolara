"use client";

import { useResetPassword } from "@skolara/api-client";
import { Button, Card, Input } from "@skolara/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const resetPassword = useResetPassword();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    await resetPassword.mutateAsync({ token, newPassword });
    setDone(true);
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This link is missing its reset token. Request a new one below.
        </p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm text-brand-700 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your password has been reset. You&apos;ve been signed out everywhere else for
          safety — sign in again with your new password.
        </p>
        <Button className="mt-4" onClick={() => router.push("/login")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        type="password"
        placeholder="New password"
        required
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Confirm new password"
        required
        minLength={8}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      {mismatch && <p className="text-sm text-red-600">Passwords don&apos;t match.</p>}
      {resetPassword.isError && (
        <p className="text-sm text-red-600">
          This reset link is invalid or has expired — request a new one.
        </p>
      )}
      <Button type="submit" disabled={resetPassword.isPending}>
        {resetPassword.isPending ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-10rem] right-[-6rem] h-80 w-80 rounded-full bg-coral-gradient opacity-20 blur-3xl"
      />

      <Card className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-xl font-bold text-white shadow-glow">
            S
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Set a new password
            </h1>
          </div>
        </div>

        <Suspense fallback={<p className="text-center text-sm text-slate-500">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </Card>
    </main>
  );
}
