"use client";

import { ApiError, useAdmitStudent, useClasses, useStudents } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Card, EmptyState, Input, Select } from "@skolara/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { AccountFields, EMPTY_ACCOUNT, validateAccount, type AccountErrors } from "@/components/account-fields";
import { Avatar, Field, ListState, PageTitle, SidePanel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth-context";
import { classLabel } from "../home-helpers";

const VISIBLE_ROWS = 200;

function AdmitForm({ onDone }: { onDone: (name: string) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const classes = useClasses();
  const admit = useAdmitStudent();
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [classId, setClassId] = useState("");
  const [errors, setErrors] = useState<AccountErrors & { admissionNumber?: string; dateOfBirth?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: typeof errors = validateAccount(account, t);
    if (!admissionNumber.trim()) found.admissionNumber = t("people.required");
    const born = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null;
    if (!born || Number.isNaN(born.getTime()) || born.getTime() > Date.now()) found.dateOfBirth = t("people.required");
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0 || !user?.schoolId || !born) return;
    const name = `${account.firstName.trim()} ${account.lastName.trim()}`;
    admit.mutate(
      {
        schoolId: user.schoolId,
        firstName: account.firstName.trim(),
        lastName: account.lastName.trim(),
        email: account.email.trim().toLowerCase(),
        phone: account.phone.trim() || undefined,
        password: account.password,
        admissionNumber: admissionNumber.trim(),
        dateOfBirth: born,
        classId: classId || undefined,
        parentUserIds: [],
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
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("fields.admissionNumber")} error={errors.admissionNumber}>
          {(props) => <Input {...props} autoComplete="off" maxLength={40} value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} />}
        </Field>
        <Field label={t("fields.dateOfBirth")} error={errors.dateOfBirth}>
          {(props) => <Input {...props} type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />}
        </Field>
      </div>
      <Field label={t("people.classOptional")} optional>
        {(props) => (
          <Select {...props} value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{t("people.chooseLater")}</option>
            {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{classLabel(c.name, c.section ?? null)}</option>)}
          </Select>
        )}
      </Field>
      {failure && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{failure}</p>}
      <Button type="submit" disabled={admit.isPending}>{admit.isPending ? t("students.admitting") : t("people.admit")}</Button>
    </form>
  );
}

function StudentsList() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const classes = useClasses();
  const [classId, setClassId] = useState(() => params.get("class") ?? "");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const students = useStudents(classId || undefined);

  const classNames = useMemo(
    () => new Map((classes.data ?? []).map((c) => [c.id, classLabel(c.name, c.section ?? null)])),
    [classes.data],
  );
  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = students.data ?? [];
    if (!needle) return rows;
    return rows.filter(
      (s) => `${s.user.firstName} ${s.user.lastName}`.toLowerCase().includes(needle) || s.admissionNumber.toLowerCase().includes(needle),
    );
  }, [students.data, search]);
  const visible = matches.slice(0, VISIBLE_ROWS);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title={t("students.title")}
        subtitle={t("people.studentsSubtitle")}
        action={<Button onClick={() => { setAdding(true); setNotice(null); }}>{t("people.admit")}</Button>}
      />
      <p role="status" aria-live="polite" className={notice ? "text-sm font-bold text-emerald-700 dark:text-emerald-400" : "sr-only"}>{notice}</p>

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <Input type="search" aria-label={t("people.searchStudents")} placeholder={t("people.searchStudents")} value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-[14rem] flex-1" />
          <Select aria-label={t("people.classFilter")} value={classId} onChange={(e) => setClassId(e.target.value)} className="w-44">
            <option value="">{t("people.allClasses")}</option>
            {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{classLabel(c.name, c.section ?? null)}</option>)}
          </Select>
          {students.data && (
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
              {matches.length === students.data.length ? t("people.countStudents", { count: matches.length }) : t("people.countShown", { shown: matches.length, total: students.data.length })}
            </span>
          )}
        </div>

        {students.isError || !students.data ? (
          <ListState isError={students.isError} isLoading={!students.data} onRetry={() => void students.refetch()} errorText={t("people.loadError")} />
        ) : matches.length === 0 ? (
          <div className="p-5">
            {students.data.length === 0 && !classId ? (
              <EmptyState title={t("people.noStudentsTitle")} description={t("people.noStudentsBody")} />
            ) : (
              <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">{t("people.noMatches")}</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="px-4 py-3 text-start">{t("people.student")}</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("fields.admissionNumber")}</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("people.class")}</th>
                  <th scope="col" className="px-4 py-3 text-start">{t("people.contact")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map((s) => {
                  const name = `${s.user.firstName} ${s.user.lastName}`;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <th scope="row" className="px-4 py-2.5 text-start font-normal">
                        <Link href={`/school/students/${s.id}`} className="flex items-center gap-3 font-bold text-slate-900 hover:text-brand-700 dark:text-slate-50 dark:hover:text-brand-300">
                          <Avatar name={name} />
                          <span className="hover:underline">{name}</span>
                        </Link>
                      </th>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-300">{s.admissionNumber}</td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">{(s.classId && classNames.get(s.classId)) || t("people.noClass")}</td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                        <span className="block">{s.user.email}</span>
                        {s.user.phone && <span dir="ltr" className="block text-xs text-slate-600 dark:text-slate-400">{s.user.phone}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SidePanel open={adding} title={t("people.admitTitle")} onClose={() => setAdding(false)}>
        <AdmitForm
          onDone={(name) => {
            setAdding(false);
            setNotice(t("people.saved", { name }));
          }}
        />
      </SidePanel>
    </div>
  );
}

export default function StudentsPage() {
  // useSearchParams needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={null}>
      <StudentsList />
    </Suspense>
  );
}
