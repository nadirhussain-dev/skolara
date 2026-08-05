import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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

  async suggestedMatches(schoolId: string) {
    const pending = await this.prisma.paymentSubmission.findMany({
      where: { schoolId, status: "PENDING_VERIFICATION" },
    });

    const unmatchedLines = await this.prisma.bankStatementLine.findMany({
      where: { schoolId, matchedPaymentSubmissionId: null },
    });

    const suggestions = [];
    for (const submission of pending) {
      const match = unmatchedLines.find(
        (line) => Number(line.amount) === Number(submission.amountClaimed),
      );
      if (match) {
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

  async confirmMatch(schoolId: string, lineId: string, paymentSubmissionId: string) {
    const line = await this.prisma.bankStatementLine.findFirst({
      where: { id: lineId, schoolId },
    });
    if (!line) throw new NotFoundException("Bank statement line not found");

    const submission = await this.prisma.paymentSubmission.findFirst({
      where: { id: paymentSubmissionId, schoolId },
    });
    if (!submission) throw new NotFoundException("Payment submission not found");

    return this.prisma.bankStatementLine.update({
      where: { id: lineId },
      data: { matchedPaymentSubmissionId: paymentSubmissionId },
    });
  }
}
