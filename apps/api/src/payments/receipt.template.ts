import type { TDocumentDefinitions } from "pdfmake/interfaces";
import {
  documentStyles,
  fieldRow,
  footer,
  letterhead,
  tableLayout,
  type SchoolLetterhead,
} from "../documents/document-theme";

export interface ReceiptData {
  school: SchoolLetterhead;
  referenceId: string;
  studentName: string;
  admissionNumber: string;
  term: string;
  amountPaid: number;
  invoiceTotal: number;
  /** Total paid against the invoice after this payment, so the balance is honest. */
  paidToDate: number;
  verifiedOn: Date;
  verifiedBy: string;
}

function money(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;
}

export function receiptDefinition(data: ReceiptData): TDocumentDefinitions {
  const balance = data.invoiceTotal - data.paidToDate;

  return {
    info: { title: `Fee receipt ${data.referenceId}` },
    content: [
      letterhead(data.school, "Fee receipt"),

      fieldRow([
        { label: "Receipt no.", value: data.referenceId },
        { label: "Date", value: data.verifiedOn.toLocaleDateString("en-GB") },
      ]),
      fieldRow([
        { label: "Student", value: data.studentName },
        { label: "Admission no.", value: data.admissionNumber },
        { label: "Fee term", value: data.term },
      ]),

      { text: "Payment", style: "heading" },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            [
              { text: "Description", style: "tableHeader" },
              { text: "Amount", style: "tableHeader", alignment: "right" as const },
            ],
            [
              { text: `Fees for ${data.term}` },
              { text: money(data.invoiceTotal), alignment: "right" as const },
            ],
            [
              { text: "Received with thanks", bold: true },
              { text: money(data.amountPaid), alignment: "right" as const, bold: true },
            ],
            [
              { text: balance > 0 ? "Balance outstanding" : "Balance" },
              {
                text: money(Math.max(balance, 0)),
                alignment: "right" as const,
                // A remaining balance is the thing a parent most needs to
                // notice, so it's coloured rather than left to blend in.
                color: balance > 0 ? "#B45309" : undefined,
              },
            ],
          ],
        },
        layout: tableLayout,
      },

      footer(
        `Verified by ${data.verifiedBy} on ${data.verifiedOn.toLocaleDateString("en-GB")}. ` +
          "This is a computer-generated receipt and needs no signature. " +
          `Quote ${data.referenceId} in any correspondence about this payment.`,
      ),
    ],
    styles: documentStyles,
  };
}
