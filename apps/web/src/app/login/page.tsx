"use client";

import { useLogin } from "@skolara/api-client";
import { Button, Card, Input } from "@skolara/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setStoredAccessToken } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/super-admin/schools",
  SCHOOL_ADMIN: "/school/analytics",
  TEACHER: "/teacher/gradebook",
};

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subdomain, setSubdomain] = useState("");

  const auth = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await login.mutateAsync({
      email,
      password,
      subdomain: subdomain || undefined,
    });
    setStoredAccessToken(result.accessToken);
    auth.login(result.user);
    router.push(ROLE_HOME[result.user.role] ?? "/mobile-only");
  }

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
              Welcome back
            </h1>
            <p className="text-sm text-slate-500">Sign in to your Skolara account</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            placeholder="School subdomain (optional)"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {login.isError && (
            <p className="text-sm text-red-600">
              Invalid credentials. Please try again.
            </p>
          )}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
