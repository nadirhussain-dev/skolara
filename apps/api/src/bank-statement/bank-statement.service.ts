import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  BankStatementImportResult,
  BankStatementRejection,
  BankStatementRejectionReason,
  ImportBankStatementInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

/**
 * How many bad rows we describe in the response. A statement is pasted by
 * hand, so a file that is entirely garbage shouldn't echo itself back.
 */
const MAX_REPORTED_REJECTIONS = 50;

/**
 * Splits one CSV row into fields, honouring double-quoted fields.
 *
 * Written out rather than done with `split(",")` because the field that most
 * needs protecting is the amount: a bank exporting `"1,000.00"` quotes it, and
 * splitting on every comma turns a thousand rupees into one.
 */
function splitCsvRow(row: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];

    if (inQuotes) {
      if (char === '"') {
        if (row[index + 1] === '"') {
          field += '"'; // `""` is an escaped quote inside a quoted field.
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }

  fields.push(field);
  return fields;
}

/**
 * Whether the first row is a header rather than data.
 *
 * Column *names* are not a reliable signal — banks label the columns
 * "Transaction Date", "Credit", "Narration" and much else — so this tests the
 * shape instead: a header has no date in the date column and no number in the
 * amount column. A data row with a mistyped date still has a numeric amount,
 * so it stays a reported rejection rather than being quietly taken for a
 * header, which is the failure this whole change exists to remove.
 */
function isHeaderRow(row: string): boolean {
  const fields = splitCsvRow(row);
  if (fields.length < 2) return false;

  const dateIsADate = !Number.isNaN(new Date(fields[0].trim()).getTime());
  const amountField = fields[1].replace(/,/g, "").trim();
  const amountIsANumber = amountField !== "" && Number.isFinite(Number(amountField));

  return !dateIsADate && !amountIsANumber;
}

@Injectable()
export class BankStatementService {
  constructor(private prisma: PrismaService) {}

  /**
   * Imports a bank statement pasted as CSV: `date,amount,description`, with an
   * optional header row.
   *
   * Rows that can't be read are reported rather than dropped. The previous
   * behaviour skipped them silently and returned only a count, so a statement
   * where forty rows failed to parse reported success and the admin had no way
   * to know the reconciliation pool was missing half the month.
   *
   * Always returns a result, including when nothing imported: "imported 0,
   * skipped 40, here's why" tells an admin what to fix, where a bare error
   * doesn't.
   */
  async import(
    schoolId: string,
    input: ImportBankStatementInput,
  ): Promise<BankStatementImportResult> {
    const rows = input.csvContent.split("\n");

    const lines: { transactionDate: Date; amount: number; description: string }[] = [];
    const rejections: BankStatementRejection[] = [];
    let skipped = 0;

    let seenContentRow = false;

    for (const [index, raw] of rows.entries()) {
      const row = raw.trim();
      if (!row) continue;

      // A header is expected, not a problem — but only on the first row with
      // content in it. Anywhere else an unreadable row is a real rejection.
      const isHeaderCandidate = !seenContentRow;
      seenContentRow = true;
      if (isHeaderCandidate && isHeaderRow(row)) continue;

      const parsed = this.parseRow(row);
      if (!("reason" in parsed)) {
        lines.push(parsed);
        continue;
      }

      skipped += 1;
      if (rejections.length < MAX_REPORTED_REJECTIONS) {
        rejections.push({
          line: index + 1,
          content: row.length > 120 ? `${row.slice(0, 120)}...` : row,
          reason: parsed.reason,
        });
      }
    }

    if (lines.length > 0) {
      await this.prisma.bankStatementLine.createMany({
        data: lines.map((line) => ({ schoolId, ...line })),
      });
    }

    return { imported: lines.length, skipped, rejections };
  }

  /**
   * Reads one row into a line, or says why it couldn't.
   */
  private parseRow(
    row: string,
  ):
    | { transactionDate: Date; amount: number; description: string }
    | { reason: BankStatementRejectionReason } {
    const fields = splitCsvRow(row);
    if (fields.length < 3) return { reason: "MALFORMED" };

    const [dateField, amountField, ...descriptionFields] = fields;

    const transactionDate = new Date(dateField.trim());
    if (Number.isNaN(transactionDate.getTime())) return { reason: "BAD_DATE" };

    // An unquoted `1,000.00` has already been split into `1` and `000.00` by
    // the time we get here, and reads as a valid amount of 1. The shape of the
    // wreckage is recognisable — a group of at most three digits followed by a
    // field that is exactly a three-digit group — and guessing which of the two
    // readings was meant is not something an importer should do with money.
    if (
      /^\d{1,3}$/.test(amountField.trim()) &&
      /^\d{3}(\.\d{1,2})?$/.test(descriptionFields[0]?.trim() ?? "")
    ) {
      return { reason: "AMBIGUOUS_AMOUNT" };
    }

    // Commas survive here only inside what was a quoted field, where the
    // boundaries were unambiguous, so stripping them is safe.
    const cleanedAmount = amountField.replace(/,/g, "").trim();
    if (cleanedAmount === "") return { reason: "BAD_AMOUNT" };
    const amount = Number(cleanedAmount);
    // `Number("")` is 0 and `Number(" ")` is 0, which is why the emptiness
    // check above is separate — an empty amount column used to import as a
    // zero-rupee line.
    if (!Number.isFinite(amount)) return { reason: "BAD_AMOUNT" };

    return {
      transactionDate,
      amount,
      description: descriptionFields.join(",").trim(),
    };
  }

  /**
   * Pairs pending payments with bank lines of the same amount.
   *
   * A line is claimed as it is used, because two families paying the same term
   * fee is the normal case, not an edge one: offering one transfer to both
   * submissions invites an admin to confirm both, and `confirmMatch` would then
   * hand the line to whichever was confirmed second and silently un-reconcile
   * the first. Suggesting each line at most once means the screen can't propose
   * something the ledger shouldn't allow.
   *
   * Oldest submission first, so when one transfer could settle either of two
   * identical fees the longest-waiting parent is offered it.
   */
  async suggestedMatches(schoolId: string) {
    const pending = await this.prisma.paymentSubmission.findMany({
      where: { schoolId, status: "PENDING_VERIFICATION" },
      orderBy: { createdAt: "asc" },
    });

    const unmatchedLines = await this.prisma.bankStatementLine.findMany({
      where: { schoolId, matchedPaymentSubmissionId: null },
      orderBy: { transactionDate: "asc" },
    });

    const spokenFor = new Set<string>();
    const suggestions = [];
    for (const submission of pending) {
      const match = unmatchedLines.find(
        (line) =>
          !spokenFor.has(line.id) &&
          Number(line.amount) === Number(submission.amountClaimed),
      );
      if (match) {
        spokenFor.add(match.id);
        suggestions.push({
          paymentSubmissionId: submission.id,
          referenceId: submission.referenceId,
          amountClaimed: Number(submission.amountClaimed),
          bankStatementLine: match,
        });
      }
    }
    return suggestions;
  }

  /**
   * Records that a bank line is the transfer behind a payment submission.
   *
   * The line is claimed by a conditional update rather than a plain one. A
   * bare `update` re-points a line that is already reconciled against another
   * payment, which reads as success and quietly leaves the earlier submission
   * unmatched — the one outcome reconciliation exists to prevent. Requiring
   * `matchedPaymentSubmissionId: null` in the WHERE clause means a line can be
   * spent once, and a second attempt is refused instead of overwriting.
   */
  async confirmMatch(schoolId: string, lineId: string, paymentSubmissionId: string) {
    const submission = await this.prisma.paymentSubmission.findFirst({
      where: { id: paymentSubmissionId, schoolId },
      select: { id: true },
    });
    if (!submission) throw new NotFoundException("Payment submission not found");

    let claimed: { count: number };
    try {
      claimed = await this.prisma.bankStatementLine.updateMany({
        where: { id: lineId, schoolId, matchedPaymentSubmissionId: null },
        data: { matchedPaymentSubmissionId: paymentSubmissionId },
      });
    } catch (error) {
      // `matchedPaymentSubmissionId` is unique, so the database also refuses
      // the mirror of the case above: a second transfer matched to a payment
      // that already has one. Without translating it that arrives as a 500,
      // which reads as "the server is broken" rather than "that payment is
      // already reconciled".
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "That payment is already matched to another transfer",
        );
      }
      throw error;
    }

    if (claimed.count === 0) {
      // Re-read only to say which of the two it was; the decision is made.
      const line = await this.prisma.bankStatementLine.findFirst({
        where: { id: lineId, schoolId },
        select: { matchedPaymentSubmissionId: true },
      });
      if (!line) throw new NotFoundException("Bank statement line not found");
      throw new ConflictException(
        line.matchedPaymentSubmissionId === paymentSubmissionId
          ? "That transfer is already matched to this payment"
          : "That transfer is already matched to another payment",
      );
    }

    return this.prisma.bankStatementLine.findUniqueOrThrow({ where: { id: lineId } });
  }
}
