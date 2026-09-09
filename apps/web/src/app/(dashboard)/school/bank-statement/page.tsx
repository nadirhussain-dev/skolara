"use client";

import { useConfirmBankStatementMatch, useImportBankStatement, useSuggestedMatches } from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, EmptyState, PageHeader, Textarea } from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import type { BankStatementImportResult } from "@skolara/types";
import { formatCurrency } from "@skolara/utils";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";

export default function BankStatementPage() {
  const { data: matches, isLoading } = useSuggestedMatches();
  const { t, locale } = useTranslation();
  const importStatement = useImportBankStatement();
  const confirmMatch = useConfirmBankStatementMatch();

  const [csvContent, setCsvContent] = useState("");
  const [report, setReport] = useState<BankStatementImportResult | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const result = await importStatement.mutateAsync({ csvContent });
    setReport(result);
    setCsvContent("");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("bankStatement.title")}
        description={t("bankStatement.description")}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("bankStatement.importCard")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleImport} className="flex flex-col gap-3">
          <Textarea
            placeholder={"date,amount,description\n2026-08-01,15000,Fee payment ref SKL-2026-000482"}
            required
            rows={6}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
          />
          <div>
            <Button type="submit" disabled={importStatement.isPending}>
              {importStatement.isPending ? t("bankStatement.importing") : t("bankStatement.importCsv")}
            </Button>
          </div>
        </form>

        {report && (
          <div className="mt-4 flex flex-col gap-3">
            <p
              className={
                report.skipped > 0
                  ? "text-sm text-amber-600"
                  : "text-sm text-emerald-600"
              }
            >
              {report.skipped > 0
                ? t("bankStatement.importedWithSkipped", {
                    count: report.imported,
                    skipped: report.skipped,
                  })
                : t("bankStatement.imported", { count: report.imported })}
            </p>

            {report.rejections.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="text-sm font-medium">{t("bankStatement.skippedRowsTitle")}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {t("bankStatement.skippedRowsBody")}
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {report.rejections.map((rejection) => (
                    <li key={rejection.line} className="text-xs">
                      <span className="font-mono text-slate-500">
                        {t("bankStatement.lineNumber", { line: rejection.line })}
                      </span>{" "}
                      {t(`bankStatement.rejection.${rejection.reason}`)}{" "}
                      <span className="font-mono text-slate-400">{rejection.content}</span>
                    </li>
                  ))}
                </ul>
                {report.skipped > report.rejections.length && (
                  <p className="mt-2 text-xs text-slate-500">
                    {t("bankStatement.andMoreSkipped", {
                      count: report.skipped - report.rejections.length,
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("bankStatement.suggestedMatches")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {confirmMatch.isError && (
          <p className="text-sm text-rose-600">{t("bankStatement.matchRefused")}</p>
        )}
        {matches?.length === 0 && (
          <EmptyState
            title={t("bankStatement.noMatches")}
            description={t("bankStatement.noMatchesBody")}
          />
        )}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {matches?.map((match) => (
            <div
              key={`${match.bankStatementLine.id}-${match.paymentSubmissionId}`}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="font-medium">{match.bankStatementLine.description}</p>
                <p className="text-sm text-slate-500">
                  {t("bankStatement.matchSummary", {
                    date: new Date(
                      match.bankStatementLine.transactionDate,
                    ).toLocaleDateString(intlLocale(locale)),
                    amount: formatCurrency(Number(match.bankStatementLine.amount)),
                    claimed: formatCurrency(Number(match.amountClaimed)),
                    reference: match.referenceId,
                  })}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  confirmMatch.mutate({
                    lineId: match.bankStatementLine.id,
                    paymentSubmissionId: match.paymentSubmissionId,
                  })
                }
                disabled={confirmMatch.isPending}
              >
                {t("bankStatement.confirmMatch")}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
