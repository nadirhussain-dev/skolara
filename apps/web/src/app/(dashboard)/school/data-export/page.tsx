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
import { useTranslation } from "@skolara/i18n";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { datedFilename, saveCsv, saveJson } from "@/lib/download";

export default function DataExportPage() {
  const api = useApiClient();
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t("dataExport.couldNotBuild"));
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
      setError(err instanceof Error ? err.message : t("dataExport.couldNotBuild"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("dataExport.title")}
        description={t("dataExport.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("dataExport.fullExport")}</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-slate-500">{t("dataExport.fullExportBody")}</p>
        <Button onClick={downloadBundle} disabled={busy !== null}>
          {busy === "bundle" ? t("dataExport.building") : t("dataExport.downloadJson")}
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dataExport.oneTable")}</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            value={table}
            onChange={(e) => setTable(e.target.value)}
            className="max-w-xs"
          >
            <option value="">{t("dataExport.selectTable")}</option>
            {tableList?.tables.map((name) => (
              <option key={name} value={name}>
                {name.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={downloadTable} disabled={!table || busy !== null}>
            {busy === "csv" ? t("dataExport.building") : t("dataExport.downloadCsv")}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dataExport.whatIsntIn")}</CardTitle>
        </CardHeader>
        {/* Stated plainly rather than buried: a school comparing platforms on
            portability deserves to know the edges before it relies on this. */}
        <ul className="flex flex-col gap-2 text-sm text-slate-500">
          <li>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {t("dataExport.filesAreLinksTitle")}
            </span>{" "}
            {t("dataExport.filesAreLinksBody")}
          </li>
          <li>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {t("dataExport.credentialsTitle")}
            </span>{" "}
            {t("dataExport.credentialsBody")}
          </li>
          <li>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {t("dataExport.logsTitle")}
            </span>{" "}
            {t("dataExport.logsBody")}
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
