"use client";

import { useCreateExpense, useDeleteExpense, useExpenses, useReviewExpense } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { Expense, ExpenseStatus, FinanceOverview } from "@skolara/types";
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton, cn } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import { useState, type FormEvent } from "react";
import { intlLocale } from "@/lib/intl";
import { defaultSpentOn, parseAmount } from "./finance-helpers";
import { safeHttpUrl } from "@/lib/safe-url";

const STATUS_TONE = { PENDING: "warning", APPROVED: "success", DECLINED: "danger" } as const;
const STATUS_LABEL = {
  PENDING: "finance.statusPENDING",
  APPROVED: "finance.statusAPPROVED",
  DECLINED: "finance.statusDECLINED",
} as const;
const FILTERS: Array<ExpenseStatus | "ALL"> = ["ALL", "PENDING", "APPROVED", "DECLINED"];

function ExpenseRow({ expense, overview }: { expense: Expense; overview: FinanceOverview }) {
  const { t, locale } = useTranslation();
  const review = useReviewExpense();
  const remove = useDeleteExpense();
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const category = overview.categories.find((c) => c.categoryId === expense.categoryId);
  const bill = safeHttpUrl(expense.billUrl);
  const date = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(expense.spentOn));
  const busy = review.isPending || remove.isPending;
  const onError = () => setError(t("common.somethingWentWrong"));

  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="font-extrabold text-slate-900 dark:text-slate-50">{expense.payee}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {expense.categoryName} · {date}
            {expense.description ? ` · ${expense.description}` : ""}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{t("finance.raisedBy", { name: expense.raisedByName })}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={STATUS_TONE[expense.status]}>{t(STATUS_LABEL[expense.status])}</Badge>
          <span className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-slate-50">{formatCurrency(expense.amount)}</span>
        </div>
      </div>

      {expense.status === "PENDING" && category && (
        <p className="text-sm font-bold text-red-700 dark:text-red-400">
          {category.budget === null
            ? t("finance.takesToNoBudget", { name: category.name })
            : t("finance.takesTo", {
                name: category.name,
                total: formatCurrency(category.spent + expense.amount),
                budget: formatCurrency(category.budget),
              })}
        </p>
      )}
      {expense.status === "DECLINED" && expense.reviewNote && (
        <p className="text-sm text-slate-700 dark:text-slate-300">{expense.reviewNote}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {bill && (
          <a href={bill} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[2.75rem] items-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
            {t("finance.seeBill")}
          </a>
        )}
        {expense.status === "PENDING" && !declining && (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setDeclining(true)} className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 dark:text-red-400">
              {t("finance.decline")}
            </Button>
            <Button
              disabled={busy}
              onClick={() => review.mutate({ id: expense.id, decision: "APPROVED" }, { onError })}
              className="bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900"
            >
              {t("finance.approve")}
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={() => remove.mutate(expense.id, { onError })}
              className="min-h-[2.75rem] rounded-lg px-3 text-sm font-bold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {t("finance.removeExpense")}
            </button>
          </>
        )}
      </div>

      {declining && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!note.trim()) {
              setError(t("finance.declineReasonRequired"));
              return;
            }
            review.mutate({ id: expense.id, decision: "DECLINED", note: note.trim() }, { onError });
          }}
        >
          <div className="min-w-0 flex-1 basis-64">
            <label htmlFor={`decline-${expense.id}`} className="mb-1 block text-sm font-bold text-slate-900 dark:text-slate-50">
              {t("finance.declineReason")}
            </label>
            <Input id={`decline-${expense.id}`} autoFocus maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="button" variant="ghost" onClick={() => { setDeclining(false); setError(null); }}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={busy} className="bg-red-700 hover:bg-red-800 active:bg-red-900">{t("finance.decline")}</Button>
        </form>
      )}
      {error && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>}
    </li>
  );
}

function AddExpenseForm({ overview, onDone }: { overview: FinanceOverview; onDone: (status: ExpenseStatus) => void }) {
  const { t } = useTranslation();
  const create = useCreateExpense();
  const options = overview.categories.filter((c) => !c.archived);
  const [categoryId, setCategoryId] = useState(options[0]?.categoryId ?? "");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState(() => defaultSpentOn(overview.month));
  const [description, setDescription] = useState("");
  const [billUrl, setBillUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = parseAmount(amount);
    if (!categoryId || !payee.trim() || value === null || value <= 0 || !spentOn) {
      setError(t("finance.amountInvalid"));
      return;
    }
    if (billUrl.trim() && !safeHttpUrl(billUrl.trim())) {
      setError(t("finance.billLink"));
      return;
    }
    setError(null);
    create.mutate(
      {
        categoryId,
        payee: payee.trim(),
        amount: value,
        spentOn,
        description: description.trim() || undefined,
        billUrl: billUrl.trim() || undefined,
      },
      {
        onSuccess: (expense) => onDone(expense.status),
        onError: (e) => setError(e instanceof Error ? e.message : t("common.somethingWentWrong")),
      },
    );
  }

  const label = "mb-1 block text-sm font-bold text-slate-900 dark:text-slate-50";
  return (
    <Card>
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="exp-payee" className={label}>{t("finance.payee")}</label>
          <Input id="exp-payee" required maxLength={120} value={payee} onChange={(e) => setPayee(e.target.value)} />
        </div>
        <div>
          <label htmlFor="exp-category" className={label}>{t("finance.category")}</label>
          <Select id="exp-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {options.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="exp-amount" className={label}>{t("finance.amount")} (Rs)</label>
          <Input id="exp-amount" required inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />
        </div>
        <div>
          <label htmlFor="exp-date" className={label}>{t("finance.spentOn")}</label>
          <Input id="exp-date" required type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
        </div>
        <div>
          <label htmlFor="exp-desc" className={label}>{t("finance.description")} <span className="font-medium text-slate-600 dark:text-slate-400">({t("common.optional")})</span></label>
          <Input id="exp-desc" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label htmlFor="exp-bill" className={label}>{t("finance.billLink")} <span className="font-medium text-slate-600 dark:text-slate-400">({t("common.optional")})</span></label>
          <Input id="exp-bill" type="url" inputMode="url" placeholder="https://" maxLength={2000} value={billUrl} onChange={(e) => setBillUrl(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
          <Button type="submit" disabled={create.isPending}>{create.isPending ? t("common.saving") : t("finance.saveExpense")}</Button>
          {error && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>}
        </div>
      </form>
    </Card>
  );
}

export function ExpensesTab({ overview }: { overview: FinanceOverview }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<ExpenseStatus | "ALL">(overview.pendingExpenseCount > 0 ? "PENDING" : "ALL");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const expenses = useExpenses({ month: overview.month, status: filter === "ALL" ? undefined : filter });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t("common.status")} className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "min-h-[2.5rem] rounded-lg px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700",
                filter === key ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50" : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
              )}
            >
              {key === "ALL" ? t("finance.filterAll") : t(STATUS_LABEL[key])}
            </button>
          ))}
        </div>
        <Button onClick={() => { setAdding((v) => !v); setNotice(null); }} variant={adding ? "secondary" : "primary"}>
          {adding ? t("common.cancel") : t("finance.addExpense")}
        </Button>
      </div>

      {adding && (
        <AddExpenseForm
          overview={overview}
          onDone={(status) => {
            setAdding(false);
            setNotice(status === "APPROVED" ? t("finance.expenseSavedApproved") : t("finance.expenseSavedPending"));
          }}
        />
      )}
      <p role="status" aria-live="polite" className={cn("text-sm font-bold text-emerald-700 dark:text-emerald-400", !notice && "sr-only")}>{notice}</p>

      <Card>
        {expenses.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{t("finance.loadError")}</p>
            <Button variant="secondary" onClick={() => void expenses.refetch()}>{t("common.retry")}</Button>
          </div>
        ) : !expenses.data ? (
          <div className="flex flex-col gap-3" aria-busy>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : expenses.data.length === 0 ? (
          filter === "PENDING" ? (
            <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">{t("finance.toApproveNone")}</p>
          ) : (
            <EmptyState title={t("finance.noExpenses")} description={t("finance.noExpensesHint")} />
          )
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.data.map((expense) => <ExpenseRow key={expense.id} expense={expense} overview={overview} />)}
          </ul>
        )}
      </Card>
    </div>
  );
}
