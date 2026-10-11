"use client";

import { useBulkInvoice } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { SchoolClass } from "@skolara/types";
import { Button, Card, CardTitle, Input, Select, cn } from "@skolara/ui";
import { useState, type FormEvent } from "react";
import { parseAmount } from "../finance/finance-helpers";
import { classLabel } from "../home-helpers";

export function BulkInvoicePanel({ classes }: { classes: SchoolClass[] }) {
  const { t } = useTranslation();
  const bulk = useBulkInvoice();
  const [classId, setClassId] = useState("");
  const [term, setTerm] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = parseAmount(amount);
    const due = dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null;
    if (!term.trim() || value === null || value <= 0 || !due || Number.isNaN(due.getTime())) {
      setMessage({ tone: "error", text: t("fees.bulkInvalid") });
      return;
    }
    setMessage(null);
    bulk.mutate(
      { classId: classId || undefined, term: term.trim(), amountDue: value, dueDate: due },
      {
        onSuccess: (result) =>
          setMessage({
            tone: "ok",
            text:
              result.created === 0
                ? t("fees.bulkNone")
                : result.skipped > 0
                  ? t("fees.bulkDoneSkipped", { created: result.created, skipped: result.skipped })
                  : t("fees.bulkDone", { created: result.created }),
          }),
        onError: () => setMessage({ tone: "error", text: t("common.somethingWentWrong") }),
      },
    );
  }

  const label = "mb-1 block text-sm font-bold text-slate-900 dark:text-slate-50";
  return (
    <Card>
      <CardTitle>{t("fees.bulkTitle")}</CardTitle>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t("fees.bulkIntro")}</p>
      <form onSubmit={submit} noValidate className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="bulk-class" className={label}>{t("fees.bulkWho")}</label>
          <Select id="bulk-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{t("fees.bulkWholeSchool")}</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c.name, c.section ?? null)}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="bulk-term" className={label}>{t("fees.bulkTerm")}</label>
          <Input id="bulk-term" maxLength={60} value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t("fees.bulkTermPlaceholder")} />
        </div>
        <div>
          <label htmlFor="bulk-amount" className={label}>{t("fees.bulkAmount")}</label>
          <Input id="bulk-amount" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />
        </div>
        <div>
          <label htmlFor="bulk-due" className={label}>{t("fees.bulkDue")}</label>
          <Input id="bulk-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <Button type="submit" disabled={bulk.isPending}>{bulk.isPending ? t("fees.bulkWorking") : t("fees.bulkSubmit")}</Button>
          <p role="status" aria-live="polite" className={cn("text-sm font-bold", message?.tone === "error" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
            {message?.text}
          </p>
        </div>
      </form>
    </Card>
  );
}
