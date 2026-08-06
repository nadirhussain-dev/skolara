"use client";

import { useApiClient, useCreateInvoice, useInvoicesForStudent, useStudentsByClass } from "@skolara/api-client";
import type { InvoiceStatus, SchoolClass } from "@skolara/types";
import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader, Select } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const STATUS_TONE: Record<InvoiceStatus, "success" | "warning" | "danger" | "info"> = {
  PAID: "success",
  PARTIALLY_PAID: "info",
  UNPAID: "warning",
  OVERDUE: "danger",
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const api = useApiClient();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  const [classId, setClassId] = useState("");
  const { data: students } = useStudentsByClass(classId);
  const [studentId, setStudentId] = useState("");
  const { data: invoices, isLoading } = useInvoicesForStudent(studentId || undefined);
  const createInvoice = useCreateInvoice();

  const [term, setTerm] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.schoolId || !studentId) return;
    await createInvoice.mutateAsync({
      schoolId: user.schoolId,
      studentId,
      term,
      amountDue: Number(amountDue),
      dueDate: new Date(dueDate),
    });
    setTerm("");
    setAmountDue("");
    setDueDate("");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Invoices" description="Raise fee invoices and track payment status." />
      <Card>
        <CardHeader>
          <CardTitle>Select a student</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setStudentId("");
            }}
            className="max-w-xs"
          >
            <option value="">Select class</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.section}
              </option>
            ))}
          </Select>
          <Select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="max-w-xs"
            disabled={!classId}
          >
            <option value="">Select student</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.firstName} {s.user.lastName} ({s.admissionNumber})
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {studentId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Raise an invoice</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
              <Input
                placeholder="Term (e.g. Term 1 2026)"
                required
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="max-w-[200px]"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount due"
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
                {createInvoice.isPending ? "Raising..." : "Raise invoice"}
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
            {invoices?.length === 0 && (
              <EmptyState title="No invoices yet" description="Raise the first invoice above." />
            )}
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {invoices?.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{invoice.term}</p>
                    <p className="text-sm text-slate-500">
                      Due {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {formatCurrency(Number(invoice.amountPaid))} / {formatCurrency(Number(invoice.amountDue))}
                    </span>
                    <Badge tone={STATUS_TONE[invoice.status]}>{invoice.status.replace("_", " ")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
