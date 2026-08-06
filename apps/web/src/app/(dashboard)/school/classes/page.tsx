"use client";

import { useApiClient } from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
} from "@skolara/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function ClassesPage() {
  const { user } = useAuth();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { data: classes, isLoading } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.schoolId) return;
    setIsSubmitting(true);
    try {
      await api.classes.create({
        schoolId: user.schoolId,
        name,
        section,
        academicYear,
        classTeacherId: null,
      });
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      setName("");
      setSection("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Classes" description="Set up sections and academic years." />
      <Card>
        <CardHeader>
          <CardTitle>Create a class</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder="Name (e.g. Grade 6)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-[180px]"
          />
          <Input
            placeholder="Section (e.g. A)"
            required
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="max-w-[120px]"
          />
          <Input
            placeholder="Academic year"
            required
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="max-w-[160px]"
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create class"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classes</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {classes?.length === 0 && (
          <EmptyState title="No classes yet" description="Create your first class above." />
        )}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {classes?.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3">
              <span className="font-medium">
                {c.name} — {c.section}
              </span>
              <span className="text-sm text-slate-500">{c.academicYear}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
