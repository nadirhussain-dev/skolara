"use client";

import { useStaffDirectory } from "@skolara/api-client";
import type { RoleType } from "@skolara/types";
import { Badge, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader } from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useMemo, useState } from "react";

const STAFF_ROLES: RoleType[] = ["SCHOOL_ADMIN", "TEACHER"];

export default function DirectoryPage() {
  const { t } = useTranslation();
  const [role, setRole] = useState<RoleType>("TEACHER");
  const { data: staff, isLoading } = useStaffDirectory();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (staff ?? [])
      .filter((person) => person.role === role)
      .filter((person) =>
        term
          ? `${person.firstName} ${person.lastName} ${person.email}`
              .toLowerCase()
              .includes(term)
          : true,
      );
  }, [staff, role, search]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("directory.title")}
        description={t("directory.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("directory.cardTitle")}</CardTitle>
        </CardHeader>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            {STAFF_ROLES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  role === option
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400"
                }`}
              >
                {t(`roles.${option}`)}
              </button>
            ))}
          </div>
          <Input
            placeholder={t("directory.searchHint")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        </div>

        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {!isLoading && filtered.length === 0 && (
          <EmptyState
            title={search ? t("directory.noMatch") : t("directory.noStaffInRole")}
          />
        )}

        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">
                  {person.firstName} {person.lastName}
                  {!person.isActive && (
                    <Badge tone="neutral" className="ml-2">
                      {t("accounts.inactive")}
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-slate-500">{person.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                {person.phone ? (
                  // tel: rather than a copy button — on a laptop this hands off
                  // to the desktop dialler, and admins increasingly open the
                  // dashboard on a tablet where it just calls.
                  <a
                    href={`tel:${person.phone}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-brand-700 transition hover:border-brand-300 dark:border-slate-800"
                  >
                    {t("directory.callNumber", { phone: person.phone })}
                  </a>
                ) : (
                  <span className="text-slate-400">{t("directory.noPhone")}</span>
                )}
                <a
                  href={`mailto:${person.email}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-brand-700 transition hover:border-brand-300 dark:border-slate-800"
                >
                  {t("directory.emailAction")}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
