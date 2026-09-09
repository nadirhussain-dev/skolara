import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BankStatementService } from "./bank-statement.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const LINE = "line-1";
const SUBMISSION = "submission-1";

const duplicate = () =>
  new Prisma.PrismaClientKnownRequestError("unique", {
    code: "P2002",
    clientVersion: "test",
  });

const money = (value: string) => new Prisma.Decimal(value);

describe("BankStatementService", () => {
  let prisma: {
    bankStatementLine: {
      createMany: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
    };
    paymentSubmission: { findFirst: jest.Mock; findMany: jest.Mock };
  };
  let service: BankStatementService;

  beforeEach(() => {
    prisma = {
      bankStatementLine: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue({ matchedPaymentSubmissionId: null }),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: LINE }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentSubmission: {
        findFirst: jest.fn().mockResolvedValue({ id: SUBMISSION }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new BankStatementService(prisma as unknown as PrismaService);
  });

  // ---------- import ----------

  describe("import", () => {
    it("imports the rows it can parse and skips the header", async () => {
      const result = await service.import(SCHOOL, {
        csvContent: [
          "date,amount,description",
          "2026-09-01,5000,IBFT AYESHA KHAN",
          "2026-09-02,7500,IBFT BILAL AHMED",
        ].join("\n"),
      });

      expect(result).toEqual({ imported: 2 });
      expect(prisma.bankStatementLine.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ schoolId: SCHOOL, amount: 5000, description: "IBFT AYESHA KHAN" }),
          expect.objectContaining({ schoolId: SCHOOL, amount: 7500, description: "IBFT BILAL AHMED" }),
        ],
      });
    });

    it("keeps commas that belong to the description", async () => {
      await service.import(SCHOOL, {
        csvContent: "2026-09-01,5000,IBFT KHAN, AYESHA",
      });

      expect(prisma.bankStatementLine.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ description: "IBFT KHAN, AYESHA" })],
      });
    });

    it("refuses a file with nothing parseable in it rather than reporting success", async () => {
      await expect(
        service.import(SCHOOL, { csvContent: "date,amount,description\n\n" }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.bankStatementLine.createMany).not.toHaveBeenCalled();
    });

    it("tags every line with the caller's school, never one from the file", async () => {
      await service.import(SCHOOL, { csvContent: "2026-09-01,5000,IBFT" });

      const [{ data }] = prisma.bankStatementLine.createMany.mock.calls[0] as [
        { data: { schoolId: string }[] },
      ];
      expect(data.every((line) => line.schoolId === SCHOOL)).toBe(true);
    });
  });

  // ---------- suggesting ----------

  describe("suggestedMatches", () => {
    it("offers one transfer to only one of two identical fees", async () => {
      prisma.paymentSubmission.findMany.mockResolvedValue([
        { id: "sub-a", referenceId: "SKL-2026-000001", amountClaimed: money("5000") },
        { id: "sub-b", referenceId: "SKL-2026-000002", amountClaimed: money("5000") },
      ]);
      prisma.bankStatementLine.findMany.mockResolvedValue([
        { id: "line-x", amount: money("5000") },
      ]);

      const suggestions = await service.suggestedMatches(SCHOOL);

      // The bug this replaces suggested line-x to both, inviting an admin to
      // confirm both and silently un-reconcile the first.
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({ paymentSubmissionId: "sub-a", amountClaimed: 5000 }),
      );
    });

    it("pairs two transfers with two identical fees, one each", async () => {
      prisma.paymentSubmission.findMany.mockResolvedValue([
        { id: "sub-a", referenceId: "SKL-2026-000001", amountClaimed: money("5000") },
        { id: "sub-b", referenceId: "SKL-2026-000002", amountClaimed: money("5000") },
      ]);
      prisma.bankStatementLine.findMany.mockResolvedValue([
        { id: "line-x", amount: money("5000") },
        { id: "line-y", amount: money("5000") },
      ]);

      const suggestions = await service.suggestedMatches(SCHOOL);

      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((s) => s.bankStatementLine.id)).toEqual(["line-x", "line-y"]);
    });

    it("offers the longest-waiting parent the transfer first", async () => {
      await service.suggestedMatches(SCHOOL);

      expect(prisma.paymentSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: "asc" } }),
      );
    });

    it("suggests nothing when no amount lines up", async () => {
      prisma.paymentSubmission.findMany.mockResolvedValue([
        { id: "sub-a", referenceId: "SKL-2026-000001", amountClaimed: money("5000") },
      ]);
      prisma.bankStatementLine.findMany.mockResolvedValue([
        { id: "line-x", amount: money("4999") },
      ]);

      await expect(service.suggestedMatches(SCHOOL)).resolves.toEqual([]);
    });

    it("looks only at pending payments and unspent lines, both scoped to the school", async () => {
      await service.suggestedMatches(SCHOOL);

      expect(prisma.paymentSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: SCHOOL, status: "PENDING_VERIFICATION" },
        }),
      );
      expect(prisma.bankStatementLine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: SCHOOL, matchedPaymentSubmissionId: null },
        }),
      );
    });
  });

  // ---------- confirming ----------

  describe("confirmMatch", () => {
    it("claims the line in the statement that checks it is free", async () => {
      await service.confirmMatch(SCHOOL, LINE, SUBMISSION);

      expect(prisma.bankStatementLine.updateMany).toHaveBeenCalledWith({
        where: { id: LINE, schoolId: SCHOOL, matchedPaymentSubmissionId: null },
        data: { matchedPaymentSubmissionId: SUBMISSION },
      });
    });

    it("will not steal a transfer that already settles another payment", async () => {
      prisma.bankStatementLine.updateMany.mockResolvedValue({ count: 0 });
      prisma.bankStatementLine.findFirst.mockResolvedValue({
        matchedPaymentSubmissionId: "someone-elses-payment",
      });

      await expect(service.confirmMatch(SCHOOL, LINE, SUBMISSION)).rejects.toThrow(
        ConflictException,
      );
    });

    it("says so plainly when the same match is confirmed twice", async () => {
      prisma.bankStatementLine.updateMany.mockResolvedValue({ count: 0 });
      prisma.bankStatementLine.findFirst.mockResolvedValue({
        matchedPaymentSubmissionId: SUBMISSION,
      });

      await expect(service.confirmMatch(SCHOOL, LINE, SUBMISSION)).rejects.toThrow(
        /already matched to this payment/,
      );
    });

    it("reports an unknown line as not found rather than as a conflict", async () => {
      prisma.bankStatementLine.updateMany.mockResolvedValue({ count: 0 });
      prisma.bankStatementLine.findFirst.mockResolvedValue(null);

      await expect(service.confirmMatch(SCHOOL, LINE, SUBMISSION)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("refuses a payment submission from another school", async () => {
      prisma.paymentSubmission.findFirst.mockResolvedValue(null);

      await expect(service.confirmMatch(SCHOOL, LINE, SUBMISSION)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.bankStatementLine.updateMany).not.toHaveBeenCalled();
    });

    it("turns a payment that already has a transfer into a conflict, not a 500", async () => {
      prisma.bankStatementLine.updateMany.mockRejectedValue(duplicate());

      await expect(service.confirmMatch(SCHOOL, LINE, SUBMISSION)).rejects.toThrow(
        /already matched to another transfer/,
      );
    });

    it("does not swallow an unrelated database failure", async () => {
      prisma.bankStatementLine.updateMany.mockRejectedValue(new Error("connection reset"));

      await expect(service.confirmMatch(SCHOOL, LINE, SUBMISSION)).rejects.toThrow(
        "connection reset",
      );
    });
  });
});
