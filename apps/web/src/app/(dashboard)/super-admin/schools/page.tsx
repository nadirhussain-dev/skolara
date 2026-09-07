"use client";

import {
  useApproveSchool,
  useCreateSchool,
  useRejectSchool,
  useSchools,
} from "@skolara/api-client";
import type { SubscriptionPlan } from "@skolara/types";
import { Badge, Button, Card, CardHeader, CardTitle, Input } from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useState } from "react";

const planOptions: SubscriptionPlan[] = [
  "BASIC",
  "STANDARD",
  "PREMIUM",
  "ENTERPRISE",
];

const statusTone = {
  PENDING: "warning",
  TRIAL: "info",
  ACTIVE: "success",
  EXPIRED: "warning",
  SUSPENDED: "danger",
  REJECTED: "danger",
} as const;

export default function SchoolsPage() {
  const { t } = useTranslation();
  const { data: schools, isLoading } = useSchools();
  const createSchool = useCreateSchool();
  const approveSchool = useApproveSchool();
  const rejectSchool = useRejectSchool();
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlan>("BASIC");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createSchool.mutateAsync({
      name,
      subdomain,
      plan,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
    });
    setName("");
    setSubdomain("");
    setAdminEmail("");
    setAdminPassword("");
    setAdminFirstName("");
    setAdminLastName("");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("schoolsAdmin.registerSchool")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder={t("schoolsAdmin.schoolName")}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder={t("schoolsAdmin.subdomainHint")}
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
                {t(`plans.${p}`)}
              </option>
            ))}
          </select>
          <Input
            placeholder={t("schoolsAdmin.adminFirstName")}
            required
            value={adminFirstName}
            onChange={(e) => setAdminFirstName(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder={t("schoolsAdmin.adminLastName")}
            required
            value={adminLastName}
            onChange={(e) => setAdminLastName(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            type="email"
            placeholder={t("schoolsAdmin.adminEmail")}
            required
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="password"
            placeholder={t("schoolsAdmin.adminPassword")}
            required
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            className="max-w-[180px]"
          />
          <Button type="submit" disabled={createSchool.isPending}>
            {createSchool.isPending ? t("schoolsAdmin.creating") : t("schoolsAdmin.create")}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("schoolsAdmin.schools")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {schools?.map((school) => (
            <div
              key={school.id}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="font-medium">{school.name}</p>
                <p className="text-sm text-slate-500">
                  {t("schoolsAdmin.schoolLine", {
                    subdomain: school.subdomain,
                    plan: t(`plans.${school.plan}`),
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={statusTone[school.subscriptionStatus]}>
                  {t(`subscriptionStatus.${school.subscriptionStatus}`)}
                </Badge>
                {school.subscriptionStatus === "PENDING" && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => approveSchool.mutate(school.id)}
                      disabled={approveSchool.isPending}
                    >
                      {t("schoolsAdmin.approve")}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => rejectSchool.mutate(school.id)}
                      disabled={rejectSchool.isPending}
                    >
                      {t("schoolsAdmin.reject")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
