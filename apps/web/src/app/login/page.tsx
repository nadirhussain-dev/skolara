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
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-xl font-semibold text-brand-700">
          Sign in to Skolara
        </h1>
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
