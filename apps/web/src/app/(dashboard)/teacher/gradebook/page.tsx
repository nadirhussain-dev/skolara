"use client";

import { useApiClient } from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { Card, CardHeader, CardTitle } from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export default function SelectClassPage() {
  const api = useApiClient();
  const { data: classes, isLoading } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gradebook — select a class</CardTitle>
      </CardHeader>
      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {classes?.map((c) => (
          <Link
            key={c.id}
            href={`/teacher/gradebook/${c.id}`}
            className="py-3 text-brand-700 hover:underline"
          >
            {c.name} — {c.section} ({c.academicYear})
          </Link>
        ))}
      </div>
    </Card>
  );
}
