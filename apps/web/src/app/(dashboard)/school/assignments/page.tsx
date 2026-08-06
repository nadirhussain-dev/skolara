"use client";

import { useApiClient, useClassAssignments, useCreateAssignment } from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { Button, Card, CardHeader, CardTitle, EmptyState, Input, Select } from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

export default function AssignmentsPage() {
  const api = useApiClient();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  const [classId, setClassId] = useState("");
  const { data: assignments, isLoading } = useClassAssignments(classId);
  const createAssignment = useCreateAssignment();

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) return;
    await createAssignment.mutateAsync({
      classId,
      subject,
      title,
      description: description || undefined,
      dueDate: new Date(dueDate),
    });
    setSubject("");
    setTitle("");
    setDescription("");
    setDueDate("");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign homework</CardTitle>
        </CardHeader>
        <div className="mb-3">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="max-w-xs">
            <option value="">Select class</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.section}
              </option>
            ))}
          </Select>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder="Subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="max-w-[160px]"
          />
          <Button type="submit" disabled={!classId || createAssignment.isPending}>
            {createAssignment.isPending ? "Assigning..." : "Assign"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {classId && assignments?.length === 0 && (
          <EmptyState title="No assignments for this class yet" />
        )}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {assignments?.map((a) => (
            <Link
              key={a.id}
              href={`/school/assignments/${a.id}`}
              className="flex items-center justify-between py-3 hover:text-brand-700"
            >
              <span className="font-medium">
                {a.title} ({a.subject})
              </span>
              <span className="text-sm text-slate-500">
                Due {new Date(a.dueDate).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
