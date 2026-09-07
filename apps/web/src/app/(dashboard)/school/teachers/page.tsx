"use client";

import { useCreateTeacher, useTeachers } from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader } from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function TeachersPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: teachers, isLoading } = useTeachers();
  const createTeacher = useCreateTeacher();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [subjects, setSubjects] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.schoolId) return;
    await createTeacher.mutateAsync({
      schoolId: user.schoolId,
      firstName,
      lastName,
      email,
      password,
      employeeNumber,
      subjects: subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setEmployeeNumber("");
    setSubjects("");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("teachers.title")} description={t("teachers.description")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("teachers.addTeacher")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder={t("fields.firstName")}
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder={t("fields.lastName")}
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            type="email"
            placeholder={t("fields.email")}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="password"
            placeholder={t("fields.temporaryPassword")}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="max-w-[180px]"
          />
          <Input
            placeholder={t("fields.employeeNumber")}
            required
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder={t("teachers.subjectsHint")}
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" disabled={createTeacher.isPending}>
            {createTeacher.isPending ? t("teachers.adding") : t("teachers.add")}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("teachers.title")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {teachers?.length === 0 && (
          <EmptyState title={t("teachers.noTeachers")} description={t("teachers.noTeachersBody")} />
        )}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {teachers?.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">
                  {t.user.firstName} {t.user.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {t.user.email} · {t.employeeNumber}
                </p>
              </div>
              <span className="text-sm text-slate-500">{t.subjects.join(", ")}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
