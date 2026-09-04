"use client";

import { useConfirmBankStatementMatch, useImportBankStatement, useSuggestedMatches } from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, EmptyState, PageHeader, Textarea } from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { formatCurrency } from "@skolara/utils";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";

export default function BankStatementPage() {
  const { data: matches, isLoading } = useSuggestedMatches();
  const { t, locale } = useTranslation();
  const importStatement = useImportBankStatement();
  const confirmMatch = useConfirmBankStatementMatch();

  const [csvContent, setCsvContent] = useState("");
  const [importMessage, setImportMessage] = useState("");

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const result = await importStatement.mutateAsync({ csvContent });
    setImportMessage(t("bankStatement.imported", { count: result.imported }));
    setCsvContent("");
    setTimeout(() => setImportMessage(""), 4000);
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
          {importMessage && <p className="text-sm text-emerald-600">{importMessage}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("bankStatement.suggestedMatches")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
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
