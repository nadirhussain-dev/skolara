"use client";

import { useGeneratePayslip, usePayslipsForStaff, useTeachers } from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader, Select } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import { useState } from "react";

export default function PayrollPage() {
  const { data: teachers } = useTeachers();
  const generatePayslip = useGeneratePayslip();

  const [staffUserId, setStaffUserId] = useState("");
  const { data: payslips, isLoading } = usePayslipsForStaff(staffUserId || undefined);

  const [month, setMonth] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [deductions, setDeductions] = useState("0");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffUserId) return;
    await generatePayslip.mutateAsync({
      staffUserId,
      month,
      basicSalary: Number(basicSalary),
      deductions: Number(deductions || 0),
    });
    setMonth("");
    setBasicSalary("");
    setDeductions("0");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payroll" description="Generate and review staff payslips." />
      <Card>
        <CardHeader>
          <CardTitle>Select staff member</CardTitle>
        </CardHeader>
        <Select
          value={staffUserId}
          onChange={(e) => setStaffUserId(e.target.value)}
          className="max-w-xs"
        >
          <option value="">Select teacher</option>
          {teachers?.map((t) => (
            <option key={t.userId} value={t.userId}>
              {t.user.firstName} {t.user.lastName} ({t.employeeNumber})
            </option>
          ))}
        </Select>
      </Card>

      {staffUserId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Generate payslip</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
              <Input
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="max-w-[160px]"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Basic salary"
                required
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                className="max-w-[160px]"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Deductions"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                className="max-w-[140px]"
              />
              <Button type="submit" disabled={generatePayslip.isPending}>
                {generatePayslip.isPending ? "Generating..." : "Generate"}
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payslips</CardTitle>
            </CardHeader>
            {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
            {payslips?.length === 0 && <EmptyState title="No payslips generated yet" />}
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {payslips?.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{p.month}</p>
                    <p className="text-sm text-slate-500">
                      Basic {formatCurrency(Number(p.basicSalary))} · Deductions{" "}
                      {formatCurrency(Number(p.deductions))}
                    </p>
                  </div>
                  <span className="font-semibold text-brand-700 dark:text-brand-300">
                    {formatCurrency(Number(p.netPay))}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
