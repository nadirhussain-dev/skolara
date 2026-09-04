"use client";

import { useApiClient } from "@skolara/api-client";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  PageHeader,
  Select,
} from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { datedFilename, saveCsv, saveJson } from "@/lib/download";

export default function DataExportPage() {
  const api = useApiClient();
  const { data: tableList } = useQuery({
    queryKey: ["export", "tables"],
    queryFn: () => api.exports.tables(),
  });

  const [table, setTable] = useState("");
  const [busy, setBusy] = useState<"bundle" | "csv" | null>(null);
  const [error, setError] = useState("");

  async function downloadBundle() {
    setBusy("bundle");
    setError("");
    try {
      const json = await api.exports.schoolJson();
      saveJson(json, `skolara-export-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't build that export");
    } finally {
      setBusy(null);
    }
  }

  async function downloadTable() {
    if (!table) return;
    setBusy("csv");
    setError("");
    try {
      saveCsv(await api.exports.tableCsv(table), datedFilename(table));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't build that export");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Export your data"
        description="Everything this school has in Skolara, in a form you can take elsewhere. No approval needed and no notice period."
      />

      <Card>
        <CardHeader>
          <CardTitle>Full export</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-slate-500">
          One JSON file containing every record: people, classes, attendance, fees, payments,
          marks, messages, complaints, timetable, library, transport, hostel and inventory. It
          carries a manifest with a row count per table so you can check nothing is missing.
        </p>
        <Button onClick={downloadBundle} disabled={busy !== null}>
          {busy === "bundle" ? "Building…" : "Download full export (JSON)"}
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>One table as a spreadsheet</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            value={table}
            onChange={(e) => setTable(e.target.value)}
            className="max-w-xs"
          >
            <option value="">Select a table</option>
            {tableList?.tables.map((name) => (
              <option key={name} value={name}>
                {name.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={downloadTable} disabled={!table || busy !== null}>
            {busy === "csv" ? "Building…" : "Download CSV"}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What isn&apos;t in it</CardTitle>
        </CardHeader>
        {/* Stated plainly rather than buried: a school comparing platforms on
            portability deserves to know the edges before it relies on this. */}
        <ul className="flex flex-col gap-2 text-sm text-slate-500">
          <li>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Uploaded files are links, not copies.
            </span>{" "}
            Payment screenshots, homework, study materials and generated PDFs are referenced by
            URL. Download them before the account closes.
          </li>
          <li>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Credentials are excluded by design.
            </span>{" "}
            Password hashes, session tokens, API key secrets and push tokens are not exportable —
            they are worth stealing and worth nothing to you.
          </li>
          <li>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Operational logs are separate.
            </span>{" "}
            The audit trail has its own screen and would otherwise dominate the file. Bus location
            history is not kept beyond live tracking.
          </li>
        </ul>
      </Card>

      {error && (
        <Card>
          <p className="text-sm text-rose-600">{error}</p>
        </Card>
      )}
    </div>
  );
}
