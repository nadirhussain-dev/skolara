"use client";

import { useConfirmBankStatementMatch, useImportBankStatement, useSuggestedMatches } from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, EmptyState, PageHeader, Textarea } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import { useState } from "react";

export default function BankStatementPage() {
  const { data: matches, isLoading } = useSuggestedMatches();
  const importStatement = useImportBankStatement();
  const confirmMatch = useConfirmBankStatementMatch();

  const [csvContent, setCsvContent] = useState("");
  const [importMessage, setImportMessage] = useState("");

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const result = await importStatement.mutateAsync({ csvContent });
    setImportMessage(`Imported ${result.imported} line(s).`);
    setCsvContent("");
    setTimeout(() => setImportMessage(""), 4000);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bank statement"
        description="Import statements and reconcile pending payments."
      />
      <Card>
        <CardHeader>
          <CardTitle>Import bank statement</CardTitle>
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
              {importStatement.isPending ? "Importing..." : "Import CSV"}
            </Button>
          </div>
          {importMessage && <p className="text-sm text-emerald-600">{importMessage}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggested matches</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {matches?.length === 0 && (
          <EmptyState
            title="No suggested matches"
            description="Import a statement to see matches against pending payments."
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
                  {new Date(match.bankStatementLine.transactionDate).toLocaleDateString()} ·{" "}
                  {formatCurrency(Number(match.bankStatementLine.amount))} vs. claimed{" "}
                  {formatCurrency(Number(match.amountClaimed))} · {match.referenceId}
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
                Confirm match
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
