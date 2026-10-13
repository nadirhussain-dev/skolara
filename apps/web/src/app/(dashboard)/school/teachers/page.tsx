"use client";

import { ApiError, useCreateTeacher, useTeachers } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Card, EmptyState, Input } from "@skolara/ui";
import { useMemo, useState, type FormEvent } from "react";
import { AccountFields, EMPTY_ACCOUNT, validateAccount, type AccountErrors } from "@/components/account-fields";
import { Avatar, Field, ListState, PageTitle, SidePanel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth-context";

function AddTeacherForm({ onDone }: { onDone: (name: string) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const create = useCreateTeacher();
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [subjects, setSubjects] = useState("");
  const [errors, setErrors] = useState<AccountErrors & { employeeNumber?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: typeof errors = validateAccount(account, t);
    if (!employeeNumber.trim()) found.employeeNumber = t("people.required");
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0 || !user?.schoolId) return;
    const name = `${account.firstName.trim()} ${account.lastName.trim()}`;
    create.mutate(
      {
        schoolId: user.schoolId,
        firstName: account.firstName.trim(),
        lastName: account.lastName.trim(),
        email: account.email.trim().toLowerCase(),
        phone: account.phone.trim() || undefined,
        password: account.password,
        employeeNumber: employeeNumber.trim(),
        subjects: [...new Set(subjects.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 20),
      },
      {
        onSuccess: () => onDone(name),
        onError: (error) =>
          setFailure(error instanceof ApiError && error.status === 409 ? t("people.emailTaken") : t("common.somethingWentWrong")),
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <AccountFields values={account} errors={errors} onChange={(patch) => setAccount((a) => ({ ...a, ...patch }))} />
      <Field label={t("fields.employeeNumber")} error={errors.employeeNumber}>
        {(props) => <Input {...props} autoComplete="off" maxLength={40} value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />}
      </Field>
      <Field label={t("people.subjects")} help={t("people.subjectsHelp")} optional>
        {(props) => <Input {...props} autoComplete="off" maxLength={300} value={subjects} onChange={(e) => setSubjects(e.target.value)} />}
      </Field>
      {failure && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{failure}</p>}
      <Button type="submit" disabled={create.isPending}>{create.isPending ? t("teachers.adding") : t("people.addTeacher")}</Button>
    </form>
  );
}

export default function TeachersPage() {
  const { t } = useTranslation();
  const teachers = useTeachers();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = [...(teachers.data ?? [])].sort((a, b) => a.user.firstName.localeCompare(b.user.firstName));
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        `${row.user.firstName} ${row.user.lastName}`.toLowerCase().includes(needle) ||
        row.employeeNumber.toLowerCase().includes(needle) ||
        row.subjects.some((subject) => subject.toLowerCase().includes(needle)),
    );
  }, [teachers.data, search]);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title={t("teachers.title")}
        subtitle={t("people.teachersSubtitle")}
        action={<Button onClick={() => { setAdding(true); setNotice(null); }}>{t("people.addTeacher")}</Button>}
      />
      <p role="status" aria-live="polite" className={notice ? "text-sm font-bold text-emerald-700 dark:text-emerald-400" : "sr-only"}>{notice}</p>

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <Input type="search" aria-label={t("people.searchTeachers")} placeholder={t("people.searchTeachers")} value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-[14rem] flex-1" />
          {teachers.data && <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{t("people.countTeachers", { count: matches.length })}</span>}
        </div>
        {teachers.isError || !teachers.data ? (
          <ListState isError={teachers.isError} isLoading={!teachers.data} onRetry={() => void teachers.refetch()} errorText={t("people.loadError")} />
        ) : matches.length === 0 ? (
          <div className="p-5">
            {teachers.data.length === 0 ? (
              <EmptyState title={t("people.noTeachersTitle")} description={t("people.noTeachersBody")} />
            ) : (
              <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">{t("people.noMatches")}</p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {matches.map((teacher) => {
              const name = `${teacher.user.firstName} ${teacher.user.lastName}`;
              return (
                <li key={teacher.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-bold text-slate-900 dark:text-slate-50">{name}</p>
                    <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                      {teacher.employeeNumber} · {teacher.user.email}
                    </p>
                  </div>
                  <ul aria-label={t("people.subjects")} className="flex flex-wrap gap-1.5">
                    {teacher.subjects.length === 0 ? (
                      <li className="text-sm text-slate-600 dark:text-slate-400">{t("people.noSubjects")}</li>
                    ) : (
                      teacher.subjects.map((subject) => (
                        <li key={subject} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800 dark:bg-brand-900/40 dark:text-brand-100">{subject}</li>
                      ))
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <SidePanel open={adding} title={t("people.addTeacherTitle")} onClose={() => setAdding(false)}>
        <AddTeacherForm
          onDone={(name) => {
            setAdding(false);
            setNotice(t("people.saved", { name }));
          }}
        />
      </SidePanel>
    </div>
  );
}
