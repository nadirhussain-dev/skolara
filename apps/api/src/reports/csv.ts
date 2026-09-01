/**
 * Minimal RFC 4180 CSV writer.
 *
 * Hand-rolled rather than pulled in as a dependency: the whole contract is
 * quoting, and the failure mode of getting it wrong is a spreadsheet that
 * silently shifts columns rather than an error anyone notices.
 */
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  // CRLF and a trailing newline, which is what Excel expects.
  return lines.join("\r\n") + "\r\n";
}

function escapeCell(value: string | number | null): string {
  if (value === null || value === undefined) return "";

  const text = String(value);

  // A leading =, +, - or @ makes Excel and Sheets treat the cell as a formula.
  // A school's fee export is exactly the kind of file someone opens without
  // thinking, so neutralise it with a leading apostrophe.
  const formulaSafe = /^[=+\-@]/.test(text) ? `'${text}` : text;

  if (/[",\r\n]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}
