"use client";

import { useAdmitStudent, useApiClient, useStudentsByClass } from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { Button, Card, CardHeader, CardTitle, EmptyState, Input, Select } from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function StudentsPage() {
  const { user } = useAuth();
  const api = useApiClient();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  const [selectedClassId, setSelectedClassId] = useState("");
  const { data: students, isLoading } = useStudentsByClass(selectedClassId);
  const admitStudent = useAdmitStudent();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [admitClassId, setAdmitClassId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.schoolId || !admitClassId) return;
    await admitStudent.mutateAsync({
      schoolId: user.schoolId,
      firstName,
      lastName,
      email,
      password,
      admissionNumber,
      dateOfBirth: new Date(dateOfBirth),
      classId: admitClassId,
      parentUserIds: [],
    });
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setAdmissionNumber("");
    setDateOfBirth("");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Admit a student</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder="First name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder="Last name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="password"
            placeholder="Temporary password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="max-w-[180px]"
          />
          <Input
            placeholder="Admission number"
            required
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="max-w-[160px]"
          />
          <Select
            required
            value={admitClassId}
            onChange={(e) => setAdmitClassId(e.target.value)}
          >
            <option value="">Select class</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.section}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={admitStudent.isPending}>
            {admitStudent.isPending ? "Admitting..." : "Admit student"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <Select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="mb-4 max-w-xs"
        >
          <option value="">Select a class to view its roster</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.section}
            </option>
          ))}
        </Select>

        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {selectedClassId && students?.length === 0 && (
          <EmptyState title="No students in this class yet" />
        )}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {students?.map((s) => (
            <Link
              key={s.id}
              href={`/school/students/${s.id}`}
              className="flex items-center justify-between py-3 hover:text-brand-700"
            >
              <span className="font-medium">
                {s.user.firstName} {s.user.lastName}
              </span>
              <span className="text-sm text-slate-500">{s.admissionNumber}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
