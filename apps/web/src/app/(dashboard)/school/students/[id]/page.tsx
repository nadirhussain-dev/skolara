"use client";

import {
  useAssignStudentClass,
  useClasses,
  useCreateInvoice,
  useInvoicesForStudent,
  useIssueCertificate,
  useLinkParent,
  useStudent,
  useStudentParents,
  useUnlinkParent,
  useUsers,
} from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { certificateKindSchema, type CertificateKind } from "@skolara/types";
import { Badge, Button, Card, CardTitle, EmptyState, Input, Select, Skeleton } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Avatar, Field, ListState, SidePanel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth-context";
import { intlLocale } from "@/lib/intl";
import { parseAmount } from "../../finance/finance-helpers";
import { classLabel } from "../../home-helpers";
import { safeHttpUrl } from "@/lib/safe-url";

function Fees({ studentId }: { studentId: string }) {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const invoices = useInvoicesForStudent(studentId);
  const create = useCreateInvoice();
  const [adding, setAdding] = useState(false);
  const [term, setTerm] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dateFormat = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const [now] = useState(() => Date.now());
  const owed = (invoices.data ?? []).reduce((sum, i) => sum + Math.max(0, Number(i.amountDue) - Number(i.amountPaid)), 0);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = parseAmount(amount);
    const due = dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null;
    if (!term.trim() || value === null || value <= 0 || !due || Number.isNaN(due.getTime()) || !user?.schoolId) {
      setError(t("profile.invoiceInvalid"));
      return;
    }
    setError(null);
    create.mutate(
      { schoolId: user.schoolId, studentId, term: term.trim(), amountDue: value, dueDate: due },
      {
        onSuccess: () => {
          setAdding(false);
          setTerm("");
          setAmount("");
          setDueDate("");
        },
        onError: () => setError(t("common.somethingWentWrong")),
      },
    );
  }

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <CardTitle>{t("profile.feesTitle")}</CardTitle>
          {invoices.data && (
            <p className={owed > 0 ? "text-sm font-bold text-red-700 dark:text-red-400" : "text-sm font-bold text-emerald-700 dark:text-emerald-400"}>
              {owed > 0 ? t("profile.feesOwed", { amount: formatCurrency(owed) }) : t("profile.feesClear")}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={() => setAdding(true)}>{t("profile.addInvoice")}</Button>
      </div>
      {invoices.isError || !invoices.data ? (
        <ListState isError={invoices.isError} isLoading={!invoices.data} onRetry={() => void invoices.refetch()} errorText={t("fees.loadError")} rows={3} />
      ) : invoices.data.length === 0 ? (
        <div className="p-4"><EmptyState title={t("studentDetail.noInvoices")} /></div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {invoices.data.map((invoice) => {
            const due = Number(invoice.amountDue);
            const paid = Number(invoice.amountPaid);
            const overdue = invoice.status !== "PAID" && new Date(invoice.dueDate).getTime() < now;
            const tone = invoice.status === "PAID" ? "success" : overdue ? "danger" : paid > 0 ? "info" : "warning";
            const label = invoice.status === "PAID" ? "invoiceStatus.PAID" : overdue ? "invoiceStatus.OVERDUE" : paid > 0 ? "invoiceStatus.PARTIALLY_PAID" : "invoiceStatus.UNPAID";
            return (
              <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">{invoice.term}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t("invoices.dueOn", { date: dateFormat.format(new Date(invoice.dueDate)) })} · {t("studentDetail.paidOfDue", { paid: formatCurrency(paid), due: formatCurrency(due) })}
                  </p>
                </div>
                <Badge tone={tone}>{t(label)}</Badge>
              </li>
            );
          })}
        </ul>
      )}

      <SidePanel open={adding} title={t("profile.addInvoiceTitle")} onClose={() => setAdding(false)}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field label={t("profile.invoiceFor")} help={t("fees.bulkTermPlaceholder")}>
            {(props) => <Input {...props} maxLength={60} autoComplete="off" value={term} onChange={(e) => setTerm(e.target.value)} />}
          </Field>
          <Field label={`${t("fees.amount")} (Rs)`}>
            {(props) => <Input {...props} inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />}
          </Field>
          <Field label={t("fees.bulkDue")}>
            {(props) => <Input {...props} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
          </Field>
          {error && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={create.isPending}>{create.isPending ? t("studentDetail.creating") : t("profile.addInvoice")}</Button>
        </form>
      </SidePanel>
    </Card>
  );
}

function Family({ studentId }: { studentId: string }) {
  const { t } = useTranslation();
  const parents = useStudentParents(studentId);
  const accounts = useUsers("PARENT");
  const link = useLinkParent(studentId);
  const unlink = useUnlinkParent(studentId);
  const [choice, setChoice] = useState("");
  const linked = new Set((parents.data ?? []).map((p) => p.id));
  const available = (accounts.data ?? []).filter((p) => !linked.has(p.id) && p.isActive);

  return (
    <Card className="p-0">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <CardTitle>{t("profile.familyTitle")}</CardTitle>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t("studentDetail.parentsBody")}</p>
      </div>
      {parents.isError || !parents.data ? (
        <ListState isError={parents.isError} isLoading={!parents.data} onRetry={() => void parents.refetch()} errorText={t("people.loadError")} rows={2} />
      ) : parents.data.length === 0 ? (
        <p className="px-4 py-4 text-sm font-bold text-red-700 dark:text-red-400">{t("studentDetail.noParentLinked")}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {parents.data.map((parent) => {
            const name = `${parent.firstName} ${parent.lastName}`;
            return (
              <li key={parent.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-slate-50">{name}</p>
                  <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                    {parent.email}
                    {parent.phone ? <span dir="ltr"> · {parent.phone}</span> : null}
                  </p>
                </div>
                <Button variant="ghost" disabled={unlink.isPending} onClick={() => unlink.mutate(parent.id)} aria-label={t("profile.removeParent", { name })}>
                  {t("studentDetail.unlink")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-4 dark:border-slate-800"
        onSubmit={(event) => {
          event.preventDefault();
          if (!choice) return;
          link.mutate(choice, { onSuccess: () => setChoice("") });
        }}
      >
        {accounts.data && available.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("profile.noParentAccounts")}{" "}
            <Link href="/school/users" className="font-bold text-brand-700 underline dark:text-brand-300">{t("accounts.title")}</Link>
          </p>
        ) : (
          <>
            <Field label={t("profile.chooseParent")} className="min-w-[14rem] flex-1">
              {(props) => (
                <Select {...props} value={choice} onChange={(e) => setChoice(e.target.value)}>
                  <option value="">{t("studentDetail.selectParentAccount")}</option>
                  {available.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.email})</option>)}
                </Select>
              )}
            </Field>
            <Button type="submit" disabled={!choice || link.isPending}>{link.isPending ? t("studentDetail.linking") : t("studentDetail.linkParent")}</Button>
          </>
        )}
      </form>
    </Card>
  );
}

function Certificates({ studentId }: { studentId: string }) {
  const { t } = useTranslation();
  const issue = useIssueCertificate();
  const [kind, setKind] = useState<CertificateKind>("ENROLMENT");
  const [remarks, setRemarks] = useState("");
  const [leavingDate, setLeavingDate] = useState("");
  const [issued, setIssued] = useState<{ url: string; serial: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIssued(null);
    if (kind === "LEAVING" && !leavingDate) {
      setError(t("people.required"));
      return;
    }
    issue.mutate(
      { studentId, kind, remarks: remarks.trim() || undefined, leavingDate: leavingDate ? new Date(`${leavingDate}T00:00:00.000Z`) : undefined },
      { onSuccess: (result) => setIssued({ url: result.url, serial: result.serial }), onError: () => setError(t("studentDetail.couldNotIssue")) },
    );
  }
  const url = issued ? safeHttpUrl(issued.url) : null;

  return (
    <Card>
      <CardTitle>{t("profile.certificatesTitle")}</CardTitle>
      <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Field label={t("studentDetail.type")} className="min-w-[12rem] flex-1">
            {(props) => (
              <Select {...props} value={kind} onChange={(e) => setKind(e.target.value as CertificateKind)}>
                {certificateKindSchema.options.map((option) => <option key={option} value={option}>{t(`certificateKind.${option}`)}</option>)}
              </Select>
            )}
          </Field>
          {kind === "LEAVING" && (
            <Field label={t("studentDetail.leavingDate")} className="w-44">
              {(props) => <Input {...props} type="date" value={leavingDate} onChange={(e) => setLeavingDate(e.target.value)} />}
            </Field>
          )}
        </div>
        <Field label={t("fields.notes")} optional>
          {(props) => <Input {...props} maxLength={300} value={remarks} onChange={(e) => setRemarks(e.target.value)} />}
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" disabled={issue.isPending}>{issue.isPending ? t("studentDetail.issuing") : t("studentDetail.issueCertificate")}</Button>
          {error && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>}
          {issued && (
            <p role="status" className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {t("profile.certificateReady", { serial: issued.serial })}{" "}
              {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline dark:text-brand-300">{t("studentDetail.openCertificate")}</a>}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}

export default function StudentProfilePage() {
  const { t, locale } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const student = useStudent(id);
  const classes = useClasses();
  const assign = useAssignStudentClass();
  const [classNote, setClassNote] = useState<string | null>(null);

  const back = (
    <Link href="/school/students" className="inline-flex min-h-[2.75rem] items-center gap-1 self-start text-sm font-bold text-brand-700 hover:underline dark:text-brand-300">
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180"><path d="M15 6l-6 6 6 6" /></svg>
      {t("profile.back")}
    </Link>
  );

  if (student.isError) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <Card><p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{t("profile.notFound")}</p></Card>
      </div>
    );
  }
  if (!student.data) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        {back}
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      </div>
    );
  }

  const s = student.data;
  const name = `${s.user.firstName} ${s.user.lastName}`;
  const born = s.dateOfBirth
    ? new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(s.dateOfBirth))
    : null;

  return (
    <div className="flex flex-col gap-4">
      {back}
      <Card className="flex flex-wrap items-center gap-4">
        <Avatar name={name} className="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{name}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {s.admissionNumber} · {s.user.email}
            {born ? ` · ${t("profile.born", { date: born })}` : ""}
          </p>
        </div>
        <div className="w-44">
          <Field label={t("profile.moveClass")}>
            {(props) => (
              <Select
                {...props}
                value={s.classId ?? ""}
                disabled={assign.isPending}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setClassNote(null);
                  assign.mutate({ id: s.id, classId: e.target.value }, { onSuccess: () => setClassNote(t("profile.classSaved")) });
                }}
              >
                {!s.classId && <option value="">{t("people.noClass")}</option>}
                {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{classLabel(c.name, c.section ?? null)}</option>)}
              </Select>
            )}
          </Field>
          <p role="status" aria-live="polite" className="mt-1 min-h-[1rem] text-xs font-bold text-emerald-700 dark:text-emerald-400">{classNote}</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Fees studentId={id} />
        <div className="flex flex-col gap-4">
          <Family studentId={id} />
          <Certificates studentId={id} />
        </div>
      </div>
    </div>
  );
}
