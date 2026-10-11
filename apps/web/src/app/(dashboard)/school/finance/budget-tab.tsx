"use client";

import {
  useArchiveBudgetCategory,
  useBudgetCategories,
  useCopyPreviousBudget,
  useCreateBudgetCategory,
  useSetBudget,
} from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { FinanceOverview } from "@skolara/types";
import { Button, Card, Input } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import { useState, type FormEvent } from "react";
import { parseAmount } from "./finance-helpers";

export function BudgetTab({ overview }: { overview: FinanceOverview }) {
  const { t } = useTranslation();
  const categories = useBudgetCategories();
  const setBudget = useSetBudget();
  const copyPrevious = useCopyPreviousBudget();
  const createCategory = useCreateBudgetCategory();
  const archive = useArchiveBudgetCategory();

  const active = overview.categories.filter((c) => !c.archived);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [newName, setNewName] = useState("");

  const valueFor = (id: string, budget: number | null) =>
    drafts[id] ?? (budget === null ? "" : String(budget));
  const parsed = active.map((c) => {
    const raw = valueFor(c.categoryId, c.budget).trim();
    return { id: c.categoryId, raw, amount: raw === "" ? null : parseAmount(raw) };
  });
  const invalid = parsed.some((p) => p.raw !== "" && p.amount === null);
  const total = parsed.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const dirty = Object.keys(drafts).length > 0;

  function save(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (invalid) {
      setMessage({ tone: "error", text: t("finance.amountInvalid") });
      return;
    }
    const lines = parsed
      .filter((p): p is { id: string; raw: string; amount: number } => p.amount !== null)
      .map((p) => ({ categoryId: p.id, amount: p.amount }));
    if (lines.length === 0) return;
    setBudget.mutate(
      { month: overview.month, lines },
      {
        onSuccess: () => {
          setDrafts({});
          setMessage({ tone: "ok", text: t("finance.budgetSaved") });
        },
        onError: () => setMessage({ tone: "error", text: t("common.somethingWentWrong") }),
      },
    );
  }

  function addCategory(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setMessage(null);
    createCategory.mutate(
      { name },
      {
        onSuccess: () => setNewName(""),
        onError: (error) =>
          setMessage({ tone: "error", text: error instanceof Error ? error.message : t("common.somethingWentWrong") }),
      },
    );
  }

  const archived = (categories.data ?? []).filter((c) => c.archivedAt !== null);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t("finance.budgetIntro")}</p>
        <form onSubmit={save} className="mt-4" noValidate>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {active.map((c) => {
              const entry = parsed.find((p) => p.id === c.categoryId);
              const bad = entry !== undefined && entry.raw !== "" && entry.amount === null;
              return (
                <li key={c.categoryId} className="flex flex-wrap items-center gap-3 py-3">
                  <label htmlFor={`budget-${c.categoryId}`} className="min-w-0 flex-1 basis-40 font-bold text-slate-900 dark:text-slate-50">
                    {c.name}
                    <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      {t("finance.spent")}: {formatCurrency(c.spent)}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-sm font-bold text-slate-600 dark:text-slate-400">Rs</span>
                    <Input
                      id={`budget-${c.categoryId}`}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      aria-invalid={bad}
                      value={valueFor(c.categoryId, c.budget)}
                      onChange={(e) => setDrafts((d) => ({ ...d, [c.categoryId]: e.target.value }))}
                      className={`w-36 text-end tabular-nums ${bad ? "border-red-600" : ""}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => archive.mutate({ id: c.categoryId, archived: true })}
                    disabled={archive.isPending}
                    className="min-h-[2.75rem] rounded-lg px-3 text-sm font-bold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    {t("finance.archive")}
                    <span className="sr-only"> {c.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <p className="font-extrabold text-slate-900 dark:text-slate-50">
              {t("finance.total")}: <span className="tabular-nums">{formatCurrency(total)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={copyPrevious.isPending}
                onClick={() => {
                  setMessage(null);
                  copyPrevious.mutate(overview.month, {
                    onSuccess: (result) => {
                      setDrafts({});
                      setMessage({
                        tone: "ok",
                        text: result.copied > 0 ? t("finance.copied", { count: result.copied }) : t("finance.copiedNone"),
                      });
                    },
                    onError: () => setMessage({ tone: "error", text: t("common.somethingWentWrong") }),
                  });
                }}
              >
                {t("finance.copyPrevious")}
              </Button>
              <Button type="submit" disabled={!dirty || setBudget.isPending}>
                {setBudget.isPending ? t("common.saving") : t("finance.saveBudget")}
              </Button>
            </div>
          </div>
          <p role="status" aria-live="polite" className={`mt-3 min-h-[1.25rem] text-sm font-bold ${message?.tone === "error" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
            {message?.text}
          </p>
        </form>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <form onSubmit={addCategory} className="flex flex-col gap-3">
            <label htmlFor="new-category" className="font-extrabold text-slate-900 dark:text-slate-50">
              {t("finance.addCategory")}
            </label>
            <Input id="new-category" maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("finance.categoryName")} />
            <Button type="submit" variant="secondary" disabled={!newName.trim() || createCategory.isPending}>
              {t("finance.addCategory")}
            </Button>
          </form>
        </Card>
        {archived.length > 0 && (
          <Card>
            <p className="font-extrabold text-slate-900 dark:text-slate-50">{t("finance.archivedCategories")}</p>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {archived.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => archive.mutate({ id: c.id, archived: false })}
                    className="min-h-[2.75rem] rounded-lg px-3 font-bold text-brand-700 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-brand-300 dark:hover:bg-slate-800"
                  >
                    {t("finance.restore")}
                    <span className="sr-only"> {c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
