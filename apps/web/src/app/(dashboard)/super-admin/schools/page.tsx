"use client";

import { useCreateSchool, useSchools } from "@skolara/api-client";
import type { SubscriptionPlan } from "@skolara/types";
import { Badge, Button, Card, CardHeader, CardTitle, Input } from "@skolara/ui";
import { useState } from "react";

const planOptions: SubscriptionPlan[] = [
  "BASIC",
  "STANDARD",
  "PREMIUM",
  "ENTERPRISE",
];

const statusTone = {
  TRIAL: "info",
  ACTIVE: "success",
  EXPIRED: "warning",
  SUSPENDED: "danger",
} as const;

export default function SchoolsPage() {
  const { data: schools, isLoading } = useSchools();
  const createSchool = useCreateSchool();
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlan>("BASIC");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createSchool.mutateAsync({ name, subdomain, plan });
    setName("");
    setSubdomain("");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Register a new school</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder="School name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="subdomain"
            required
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            className="max-w-[180px]"
          />
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {planOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={createSchool.isPending}>
            {createSchool.isPending ? "Creating..." : "Create school"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schools</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {schools?.map((school) => (
            <div
              key={school.id}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="font-medium">{school.name}</p>
                <p className="text-sm text-slate-500">
                  {school.subdomain}.skolara.app · {school.plan}
                </p>
              </div>
              <Badge tone={statusTone[school.subscriptionStatus]}>
                {school.subscriptionStatus}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
