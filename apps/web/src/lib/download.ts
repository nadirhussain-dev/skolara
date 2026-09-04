/** Hands a string to the browser as a downloaded file. */
export function saveCsv(csv: string, filename: string): void {
  // A BOM so Excel opens UTF-8 correctly — without it, names with accents or
  // non-Latin characters arrive mangled.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function datedFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}

/** Same, for a JSON bundle. No BOM — nothing opens these in Excel. */
export function saveJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
