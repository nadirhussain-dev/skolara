import type { Content, StyleDictionary } from "pdfmake/interfaces";

export interface SchoolLetterhead {
  name: string;
  primaryColor: string | null;
}

const DEFAULT_BRAND = "#6D28D9";
const INK = "#1A1726";
const MUTED = "#6B6684";
const RULE = "#E4E0F0";

/**
 * Shared styles so a report card, a receipt and a certificate read as three
 * documents from one school rather than three unrelated PDFs.
 */
export const documentStyles: StyleDictionary = {
  schoolName: { fontSize: 16, bold: true, color: INK },
  documentKind: { fontSize: 9, characterSpacing: 1.4, color: MUTED },
  heading: { fontSize: 13, bold: true, color: INK, margin: [0, 16, 0, 6] },
  label: { fontSize: 8, characterSpacing: 0.8, color: MUTED },
  value: { fontSize: 11, color: INK },
  tableHeader: { fontSize: 9, bold: true, color: MUTED },
  footnote: { fontSize: 8, color: MUTED, italics: true },
};

/** Hex from school branding, falling back to the product's own violet. */
export function brandColor(school: SchoolLetterhead): string {
  const isHex = school.primaryColor && /^#[0-9A-Fa-f]{6}$/.test(school.primaryColor);
  return isHex ? school.primaryColor! : DEFAULT_BRAND;
}

/**
 * Masthead: school name on the left, what this document is on the right,
 * over a rule in the school's own colour.
 */
export function letterhead(school: SchoolLetterhead, documentKind: string): Content {
  return {
    stack: [
      {
        columns: [
          { text: school.name, style: "schoolName" },
          {
            text: documentKind.toUpperCase(),
            style: "documentKind",
            alignment: "right",
            margin: [0, 5, 0, 0],
          },
        ],
      },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 4,
            x2: 515,
            y2: 4,
            lineWidth: 2,
            lineColor: brandColor(school),
          },
        ],
      },
    ],
    margin: [0, 0, 0, 14],
  };
}

/** Label-above-value pairs, laid out in columns. */
export function fieldRow(fields: { label: string; value: string }[]): Content {
  return {
    columns: fields.map((field) => ({
      stack: [
        { text: field.label.toUpperCase(), style: "label" },
        { text: field.value, style: "value", margin: [0, 2, 0, 0] },
      ],
    })),
    columnGap: 16,
    margin: [0, 0, 0, 10],
  };
}

/** Hairline table layout — no heavy borders, matching the app's own tables. */
export const tableLayout = {
  hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
    i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
  vLineWidth: () => 0,
  hLineColor: (i: number) => (i === 1 ? MUTED : RULE),
  paddingTop: () => 6,
  paddingBottom: () => 6,
};

export function footer(text: string): Content {
  return { text, style: "footnote", margin: [0, 20, 0, 0] };
}
