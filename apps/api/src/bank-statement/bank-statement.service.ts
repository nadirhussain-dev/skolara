import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ImportBankStatementInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BankStatementService {
  constructor(private prisma: PrismaService) {}

  // Expects CSV rows of `date,amount,description`, with an optional header row.
  async import(schoolId: string, input: ImportBankStatementInput) {
    const rows = input.csvContent
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const lines: { transactionDate: Date; amount: number; description: string }[] = [];
    for (const row of rows) {
      const [dateStr, amountStr, ...descParts] = row.split(",");
      const transactionDate = new Date(dateStr);
      const amount = Number(amountStr);
      if (Number.isNaN(transactionDate.getTime()) || Number.isNaN(amount)) {
        continue; // skip header row or malformed lines
      }
      lines.push({
        transactionDate,
        amount,
        description: descParts.join(",").trim(),
      });
    }

    if (lines.length === 0) {
      throw new BadRequestException("No valid rows found in CSV");
    }

    await this.prisma.bankStatementLine.createMany({
      data: lines.map((line) => ({ schoolId, ...line })),
    });

    return { imported: lines.length };
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
