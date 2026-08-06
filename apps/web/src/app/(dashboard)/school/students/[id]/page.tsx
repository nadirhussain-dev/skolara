"use client";

import {
  useCreateInvoice,
  useInvoicesForStudent,
  useStudent,
} from "@skolara/api-client";
import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, Input } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
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
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: student } = useStudent(id);
  const { data: invoices, isLoading } = useInvoicesForStudent(id);
  const createInvoice = useCreateInvoice();

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

  return (
    <div className="flex flex-col gap-6">
      {student && (
        <Card>
          <h1 className="text-lg font-semibold">
            {student.user.firstName} {student.user.lastName}
          </h1>
          <p className="text-sm text-slate-500">
            {student.admissionNumber} · {student.user.email}
          </p>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create invoice</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder="Term (e.g. Term 1 2026)"
            required
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="number"
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
            {createInvoice.isPending ? "Creating..." : "Create invoice"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {invoices?.length === 0 && <EmptyState title="No invoices yet" />}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {invoices?.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{invoice.term}</p>
                <p className="text-sm text-slate-500">
                  {formatCurrency(Number(invoice.amountPaid))} of{" "}
                  {formatCurrency(Number(invoice.amountDue))} paid
                </p>
              </div>
              <Badge tone={STATUS_TONE[invoice.status]}>{invoice.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
