"use client";

import {
  useCreateInvoice,
  useInvoicesForStudent,
  useLinkParent,
  useStudent,
  useStudentParents,
  useUnlinkParent,
  useUsers,
  useIssueCertificate,
} from "@skolara/api-client";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Select,
} from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { formatCurrency } from "@skolara/utils";
import { certificateKindSchema, type CertificateKind } from "@skolara/types";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const STATUS_TONE = {
  UNPAID: "warning",
  PARTIALLY_PAID: "info",
  PAID: "success",
  OVERDUE: "danger",
} as const;

export default function StudentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: student } = useStudent(id);
  const { data: invoices, isLoading } = useInvoicesForStudent(id);
  const createInvoice = useCreateInvoice();
  const { data: parents } = useStudentParents(id);
  const { data: parentAccounts } = useUsers("PARENT");
  const linkParent = useLinkParent(id);
  const unlinkParent = useUnlinkParent(id);

  const [parentToLink, setParentToLink] = useState("");
  const [term, setTerm] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.schoolId) return;
    await createInvoice.mutateAsync({
      schoolId: user.schoolId,
      studentId: id,
      term,
      amountDue: Number(amountDue),
      dueDate: new Date(dueDate),
    });
    setTerm("");
    setAmountDue("");
    setDueDate("");
  }

  const linkedIds = new Set(parents?.map((parent) => parent.id));
  const linkableParents = parentAccounts?.filter((parent) => !linkedIds.has(parent.id)) ?? [];

  async function handleLinkParent(e: React.FormEvent) {
    e.preventDefault();
    if (!parentToLink) return;
    await linkParent.mutateAsync(parentToLink);
    setParentToLink("");
  }

  return (
    <div className="flex flex-col gap-6">
      {student && (
        <Card>
          <h1 className="text-lg font-semibold">
            {student.user.firstName} {student.user.lastName}
          </h1>
          <p className="text-sm text-slate-500">
            {t("studentDetail.studentLine", {
              admissionNumber: student.admissionNumber,
              email: student.user.email,
            })}
          </p>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("studentDetail.parents")}</CardTitle>
        </CardHeader>
        <p className="mb-4 text-sm text-slate-500">{t("studentDetail.parentsBody")}</p>

        {parents?.length === 0 && <EmptyState title={t("studentDetail.noParentLinked")} />}

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {parents?.map((parent) => (
            <div key={parent.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">
                  {parent.firstName} {parent.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {parent.email}
                  {parent.phone ? ` · ${parent.phone}` : ""}
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={unlinkParent.isPending}
                onClick={() => unlinkParent.mutate(parent.id)}
              >
                {t("studentDetail.unlink")}
              </Button>
            </div>
          ))}
        </div>

        <form onSubmit={handleLinkParent} className="mt-4 flex flex-wrap gap-3">
          <Select
            value={parentToLink}
            onChange={(e) => setParentToLink(e.target.value)}
            className="max-w-xs"
          >
            <option value="">{t("studentDetail.selectParentAccount")}</option>
            {linkableParents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.firstName} {parent.lastName} ({parent.email})
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={!parentToLink || linkParent.isPending}>
            {linkParent.isPending ? t("studentDetail.linking") : t("studentDetail.linkParent")}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("studentDetail.createInvoice")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder={t("invoices.termHint")}
            required
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="number"
            placeholder={t("invoices.amountDue")}
            required
            value={amountDue}
            onChange={(e) => setAmountDue(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="max-w-[160px]"
          />
          <Button type="submit" disabled={createInvoice.isPending}>
            {createInvoice.isPending ? t("studentDetail.creating") : t("studentDetail.create")}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("invoices.title")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {invoices?.length === 0 && <EmptyState title={t("studentDetail.noInvoices")} />}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {invoices?.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{invoice.term}</p>
                <p className="text-sm text-slate-500">
                  {t("studentDetail.paidOfDue", {
                    paid: formatCurrency(Number(invoice.amountPaid)),
                    due: formatCurrency(Number(invoice.amountDue)),
                  })}
                </p>
              </div>
              <Badge tone={STATUS_TONE[invoice.status]}>{t(`invoiceStatus.${invoice.status}`)}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <CertificateIssuer studentId={id} />
    </div>
  );
}

function CertificateIssuer({ studentId }: { studentId: string }) {
  const { t } = useTranslation();
  const issue = useIssueCertificate();
  const [kind, setKind] = useState<CertificateKind>("ENROLMENT");
  const [remarks, setRemarks] = useState("");
  const [leavingDate, setLeavingDate] = useState("");
  const [issued, setIssued] = useState<{ url: string; serial: string } | null>(null);
  const [error, setError] = useState("");

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIssued(null);
    try {
      const result = await issue.mutateAsync({
        studentId,
        kind,
        remarks: remarks || undefined,
        leavingDate: leavingDate ? new Date(leavingDate) : undefined,
      });
      setIssued({ url: result.url, serial: result.serial });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studentDetail.couldNotIssue"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("studentDetail.issueCertificate")}</CardTitle>
      </CardHeader>
      <form onSubmit={handleIssue} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {t("studentDetail.type")}
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CertificateKind)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {certificateKindSchema.options.map((option) => (
                <option key={option} value={option}>
                  {t(`certificateKind.${option}`)}
                </option>
              ))}
            </select>
          </label>
          {kind === "LEAVING" && (
            <label className="flex flex-col gap-1 text-sm">
              {t("studentDetail.leavingDate")}
              <Input
                type="date"
                value={leavingDate}
                onChange={(e) => setLeavingDate(e.target.value)}
                required
              />
            </label>
          )}
          <Button type="submit" disabled={issue.isPending}>
            {issue.isPending ? t("studentDetail.issuing") : t("studentDetail.issue")}
          </Button>
        </div>
        <Input
          placeholder={t("studentDetail.remarksOptional")}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {issued && (
          <p className="text-sm">
            <span className="text-slate-500">{t("studentDetail.serial", { serial: issued.serial })}</span>
            <a
              href={issued.url}
              target="_blank"
              rel="noreferrer"
              className="text-brand-700 underline"
            >
              {t("studentDetail.openCertificate")}
            </a>
          </p>
        )}
      </form>
    </Card>
  );
}
