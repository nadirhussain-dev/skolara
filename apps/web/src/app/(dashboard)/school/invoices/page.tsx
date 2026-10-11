"use client";

import { useClasses, useInvoices } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { InvoiceFilter, InvoiceRow } from "@skolara/types";
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton, StatCard, cn } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import Link from "next/link";
import { useMemo, useState } from "react";
import { intlLocale } from "@/lib/intl";
import { classLabel } from "../home-helpers";
import { BulkInvoicePanel } from "./bulk-panel";
import { DefaultersTab } from "./defaulters-tab";

const FILTERS: InvoiceFilter[] = ["ALL", "UNPAID", "OVERDUE", "PAID"];
const FILTER_LABEL = {
  ALL: "fees.filterALL",
  UNPAID: "fees.filterUNPAID",
  OVERDUE: "fees.filterOVERDUE",
  PAID: "fees.filterPAID",
} as const;
/** Rows drawn at once. Past this the admin is asked to narrow the list. */
const VISIBLE_ROWS = 200;

function statusOf(invoice: InvoiceRow) {
  if (invoice.status === "PAID") return { tone: "success", key: "invoiceStatus.PAID" } as const;
  if (invoice.overdue) return { tone: "danger", key: "invoiceStatus.OVERDUE" } as const;
  if (invoice.amountPaid > 0) return { tone: "info", key: "invoiceStatus.PARTIALLY_PAID" } as const;
  return { tone: "warning", key: "invoiceStatus.UNPAID" } as const;
}

/** Fees: every invoice in the school, who is behind, and one-step billing for a class. */
export default function FeesPage() {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<"invoices" | "defaulters">("invoices");
  const [status, setStatus] = useState<InvoiceFilter>("ALL");
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [billing, setBilling] = useState(false);
  const classes = useClasses();
  const list = useInvoices({ status, classId: classId || undefined });

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = list.data?.invoices ?? [];
    if (!needle) return rows;
    return rows.filter(
      (row) => row.studentName.toLowerCase().includes(needle) || row.admissionNumber.toLowerCase().includes(needle),
    );
  }, [list.data, search]);
  const visible = matches.slice(0, VISIBLE_ROWS);
  const totals = list.data?.totals;
  const dateFormat = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const filtered = status !== "ALL" || classId !== "" || search.trim() !== "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{t("fees.title")}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("fees.subtitle")}</p>
        </div>
        <Button variant={billing ? "secondary" : "primary"} aria-expanded={billing} onClick={() => setBilling((v) => !v)}>
          {billing ? t("common.close") : t("fees.billClass")}
        </Button>
      </div>

      {billing && <BulkInvoicePanel classes={classes.data ?? []} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {totals ? (
          <>
            <StatCard label={t("fees.invoiced")} value={formatCurrency(totals.invoiced)} />
            <StatCard
              label={t("fees.collected")}
              value={formatCurrency(totals.collected)}
              hint={totals.invoiced > 0 ? t("fees.collectedHint", { rate: Math.round((totals.collected / totals.invoiced) * 100) }) : undefined}
              tone="brand"
            />
            <StatCard label={t("fees.outstanding")} value={formatCurrency(totals.outstanding)} />
            <StatCard
              label={t("fees.overdue")}
              value={formatCurrency(totals.overdue)}
              hint={t("fees.overdueHint", { count: totals.overdueCount })}
              tone={totals.overdueCount > 0 ? "danger" : "success"}
            />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[7.25rem] rounded-2xl" />)
        )}
      </div>

      <div role="tablist" aria-label={t("fees.title")} className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(["invoices", "defaulters"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px flex h-11 items-center border-b-[3px] px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700",
              tab === key
                ? "border-brand-700 text-brand-800 dark:border-brand-300 dark:text-brand-200"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {t(key === "invoices" ? "fees.tabInvoices" : "fees.tabDefaulters")}
          </button>
        ))}
      </div>

      {tab === "defaulters" ? (
        <DefaultersTab />
      ) : (
        <Card className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
            <div role="group" aria-label={t("common.status")} className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={status === key}
                  onClick={() => setStatus(key)}
                  className={cn(
                    "min-h-[2.5rem] rounded-lg px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700",
                    status === key ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50" : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
                  )}
                >
                  {t(FILTER_LABEL[key])}
                </button>
              ))}
            </div>
            <Select aria-label={t("fees.classFilter")} value={classId} onChange={(e) => setClassId(e.target.value)} className="w-44">
              <option value="">{t("fees.allClasses")}</option>
              {(classes.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{classLabel(c.name, c.section ?? null)}</option>
              ))}
            </Select>
            <Input
              type="search"
              aria-label={t("fees.searchLabel")}
              placeholder={t("fees.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[12rem] flex-1"
            />
          </div>

          {list.isError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{t("fees.loadError")}</p>
              <Button variant="secondary" onClick={() => void list.refetch()}>{t("common.retry")}</Button>
            </div>
          ) : !list.data ? (
            <div className="flex flex-col gap-3 p-5" aria-busy>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
          ) : matches.length === 0 ? (
            <div className="p-5">
              {filtered ? (
                <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">{t("fees.emptyFiltered")}</p>
              ) : (
                <EmptyState title={t("fees.emptyTitle")} description={t("fees.emptyBody")} />
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:text-slate-400">
                      <th scope="col" className="px-4 py-3 text-start">{t("fees.student")}</th>
                      <th scope="col" className="px-3 py-3 text-start">{t("fees.class")}</th>
                      <th scope="col" className="px-3 py-3 text-start">{t("fees.term")}</th>
                      <th scope="col" className="px-3 py-3 text-start">{t("fees.due")}</th>
                      <th scope="col" className="px-3 py-3 text-end">{t("fees.amount")}</th>
                      <th scope="col" className="px-3 py-3 text-end">{t("fees.balance")}</th>
                      <th scope="col" className="px-4 py-3 text-start">{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visible.map((invoice) => {
                      const state = statusOf(invoice);
                      return (
                        <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <th scope="row" className="px-4 py-3 text-start font-normal">
                            <Link href={`/school/students/${invoice.studentId}`} className="font-bold text-slate-900 hover:text-brand-700 hover:underline dark:text-slate-50 dark:hover:text-brand-300">
                              {invoice.studentName}
                            </Link>
                            <span className="block text-xs text-slate-600 dark:text-slate-400">{invoice.admissionNumber}</span>
                          </th>
                          <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                            {invoice.className ? classLabel(invoice.className, invoice.classSection) : t("fees.noClass")}
                          </td>
                          <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{invoice.term}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-700 dark:text-slate-300">{dateFormat.format(new Date(invoice.dueDate))}</td>
                          <td className="px-3 py-3 text-end tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(invoice.amountDue)}</td>
                          <td className={cn("px-3 py-3 text-end font-bold tabular-nums", invoice.overdue ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-50")}>
                            {formatCurrency(invoice.balance)}
                          </td>
                          <td className="px-4 py-3"><Badge tone={state.tone}>{t(state.key)}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                {t("fees.showing", { shown: visible.length, total: matches.length })}
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
