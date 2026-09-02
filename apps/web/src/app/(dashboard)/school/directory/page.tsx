"use client";

import { useStaffDirectory } from "@skolara/api-client";
import type { RoleType } from "@skolara/types";
import { Badge, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader } from "@skolara/ui";
import { useMemo, useState } from "react";

const STAFF_ROLES: RoleType[] = ["SCHOOL_ADMIN", "TEACHER"];

function humanise(role: string): string {
  const lower = role.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default function DirectoryPage() {
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
        title="Staff directory"
        description="Call or email colleagues without leaving the dashboard."
      />

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
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
                {humanise(option)}
              </button>
            ))}
          </div>
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        </div>

        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <EmptyState title={search ? "Nobody matches that search." : "No staff in this role yet."} />
        )}

        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">
                  {person.firstName} {person.lastName}
                  {!person.isActive && (
                    <Badge tone="neutral" className="ml-2">
                      Inactive
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
                    Call {person.phone}
                  </a>
                ) : (
                  <span className="text-slate-400">No phone on file</span>
                )}
                <a
                  href={`mailto:${person.email}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-brand-700 transition hover:border-brand-300 dark:border-slate-800"
                >
                  Email
                </a>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
