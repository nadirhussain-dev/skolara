import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaymentsService } from "./payments.service";
import type { DocumentsService } from "../documents/documents.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";

const SCHOOL = "school-1";
const STUDENT = "student-1";
const INVOICE = "invoice-1";
const SUBMISSION = "submission-1";
const PARENT = "parent-1";
const ADMIN = "admin-1";

const user = (overrides: Partial<AuthenticatedUser>): AuthenticatedUser =>
  ({ id: PARENT, schoolId: SCHOOL, role: "PARENT", email: "a@b.c", ...overrides }) as AuthenticatedUser;

const money = (value: string) => new Prisma.Decimal(value);

/**
 * A verified submission as `renderReceipt` re-reads it — with the school,
 * invoice and student joined on, since the receipt is assembled from those.
 */
const verifiedRow = () => ({
  id: SUBMISSION,
  referenceId: "SKL-2026-000001",
  status: "VERIFIED",
  amountClaimed: money("3000"),
  reviewedAt: new Date("2026-09-04T00:00:00.000Z"),
  school: { name: "Iqbal Public School", primaryColor: "#6D28D9" },
  invoice: { term: "Term 1 2026", amountDue: money("10000"), amountPaid: money("3000") },
  student: {
    admissionNumber: "A-1",
    user: { firstName: "Zara", lastName: "Ali" },
  },
});

describe("PaymentsService", () => {
  let prisma: {
    invoice: { findFirst: jest.Mock };
    paymentSubmission: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    paymentReferenceSequence: { upsert: jest.Mock };
    studentProfile: { findFirst: jest.Mock };
    parentStudentLink: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    $executeRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let notifications: { sendPhoneAlert: jest.Mock; sendPush: jest.Mock };
  let documents: { renderAndStore: jest.Mock };
  let service: PaymentsService;

  const submission = (overrides = {}) => ({
    id: SUBMISSION,
    referenceId: "SKL-2026-000001",
    schoolId: SCHOOL,
    studentId: STUDENT,
    invoiceId: INVOICE,
    amountClaimed: money("3000"),
    status: "PENDING_VERIFICATION",
    submittedByUser: { id: PARENT, phone: "+923001234567" },
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      invoice: {
        findFirst: jest.fn().mockResolvedValue({ id: INVOICE, amountDue: money("10000") }),
      },
      paymentSubmission: {
        create: jest.fn().mockResolvedValue({ id: SUBMISSION }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue(verifiedRow()),
        update: jest.fn().mockResolvedValue({ id: SUBMISSION }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentReferenceSequence: { upsert: jest.fn().mockResolvedValue({ lastSequence: 42 }) },
      studentProfile: { findFirst: jest.fn().mockResolvedValue({ id: STUDENT }) },
      parentStudentLink: { findUnique: jest.fn().mockResolvedValue({ parentUserId: PARENT }) },
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: "Ayesha", lastName: "Khan" }),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn().mockImplementation(async (arg) =>
        typeof arg === "function" ? arg(prisma) : Promise.all(arg),
      ),
    };
    notifications = { sendPhoneAlert: jest.fn(), sendPush: jest.fn() };
    documents = { renderAndStore: jest.fn().mockResolvedValue({ url: "https://x/receipt.pdf" }) };
    service = new PaymentsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      documents as unknown as DocumentsService,
    );
  });

  // ---------- who may pay for whom ----------

  describe("assertCanSubmitFor", () => {
    it("lets a student pay their own invoice", async () => {
      await expect(
        service.assertCanSubmitFor(user({ id: "u", role: "STUDENT" }), STUDENT),
      ).resolves.toBeUndefined();
    });

    it("refuses a student paying for someone else", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.assertCanSubmitFor(user({ id: "u", role: "STUDENT" }), STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lets a parent pay for a linked child", async () => {
      await expect(
        service.assertCanSubmitFor(user({ role: "PARENT" }), STUDENT),
      ).resolves.toBeUndefined();
    });

    it("refuses a parent paying for a child that isn't theirs", async () => {
      prisma.parentStudentLink.findUnique.mockResolvedValue(null);

      await expect(service.assertCanSubmitFor(user({ role: "PARENT" }), STUDENT)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it.each(["SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN"] as const)(
      "refuses a %s submitting a payment on a family's behalf",
      async (role) => {
        await expect(service.assertCanSubmitFor(user({ role }), STUDENT)).rejects.toThrow(
          ForbiddenException,
        );
      },
    );
  });

  // ---------- submitting ----------

  describe("submitPayment", () => {
    const input = {
      invoiceId: INVOICE,
      amountClaimed: 3000,
      screenshotUrl: "https://x/shot.png",
    };

    it("refuses an invoice belonging to another student, not just another school", async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.submitPayment(SCHOOL, STUDENT, PARENT, input)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: INVOICE, schoolId: SCHOOL, studentId: STUDENT },
      });
    });

    it("stamps a per-school, per-year reference id on the submission", async () => {
      await service.submitPayment(SCHOOL, STUDENT, PARENT, input);

      const year = new Date().getFullYear();
      expect(prisma.paymentReferenceSequence.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId_year: { schoolId: SCHOOL, year } },
        }),
      );
      expect(prisma.paymentSubmission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referenceId: `SKL-${year}-000042`,
          status: "PENDING_VERIFICATION",
        }),
      });
    });

    it("flags a likely double submission for the reviewer without blocking the parent", async () => {
      prisma.paymentSubmission.findFirst.mockResolvedValue({ referenceId: "SKL-2026-000007" });

      await service.submitPayment(SCHOOL, STUDENT, PARENT, input);

      expect(prisma.paymentSubmission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reviewNote: expect.stringContaining("SKL-2026-000007"),
        }),
      });
    });

    it("leaves the review note empty when nothing similar is pending", async () => {
      await service.submitPayment(SCHOOL, STUDENT, PARENT, input);

      expect(prisma.paymentSubmission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ reviewNote: null }),
      });
    });
  });

  // ---------- the queue ----------

  describe("listQueue", () => {
    it("scopes the queue to the school and shows the oldest first", async () => {
      await service.listQueue(SCHOOL);

      expect(prisma.paymentSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: SCHOOL },
          orderBy: { createdAt: "asc" },
        }),
      );
    });

    it("filters by status when one is asked for", async () => {
      await service.listQueue(SCHOOL, "PENDING_VERIFICATION");

      expect(prisma.paymentSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: SCHOOL, status: "PENDING_VERIFICATION" },
        }),
      );
    });
  });

  // ---------- verifying: the money path ----------

  describe("review — VERIFIED", () => {
    beforeEach(() => {
      prisma.paymentSubmission.findFirst.mockResolvedValue(submission());
    });

    it("credits the invoice with one statement rather than a read and a write", async () => {
      await service.review(SCHOOL, SUBMISSION, ADMIN, { status: "VERIFIED" });

      // The invoice balance is never read into JavaScript and written back:
      // two submissions against one invoice, verified at the same moment,
      // would both read the same balance and the second would overwrite the
      // first, banking one transfer and losing the other.
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      const [strings] = prisma.$executeRaw.mock.calls[0] as [string[]];
      const sql = strings.join("?");
      expect(sql).toContain('UPDATE "Invoice"');
      expect(sql).toContain('"amountPaid" = "amountPaid" +');
      expect(sql).toContain('"schoolId" =');
    });

    it("claims the submission before crediting, so a second reviewer loses", async () => {
      await service.review(SCHOOL, SUBMISSION, ADMIN, { status: "VERIFIED" });

      expect(prisma.paymentSubmission.updateMany).toHaveBeenCalledWith({
        where: { id: SUBMISSION, schoolId: SCHOOL, status: { not: "VERIFIED" } },
        data: expect.objectContaining({ status: "VERIFIED", reviewedByUserId: ADMIN }),
      });
    });

    it("does not credit the invoice twice when two admins verify at once", async () => {
      prisma.paymentSubmission.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.review(SCHOOL, SUBMISSION, ADMIN, { status: "VERIFIED" }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it("refuses to re-verify a submission that is already verified", async () => {
      prisma.paymentSubmission.findFirst.mockResolvedValue(
        submission({ status: "VERIFIED" }),
      );

      await expect(
        service.review(SCHOOL, SUBMISSION, ADMIN, { status: "VERIFIED" }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it("refuses a submission from another school", async () => {
      prisma.paymentSubmission.findFirst.mockResolvedValue(null);

      await expect(
        service.review(SCHOOL, SUBMISSION, ADMIN, { status: "VERIFIED" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("renders the receipt outside the transaction and returns its url", async () => {
      const result = await service.review(SCHOOL, SUBMISSION, ADMIN, { status: "VERIFIED" });

      expect(documents.renderAndStore).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ receiptUrl: "https://x/receipt.pdf" }));
    });

    it("keeps the payment verified when the receipt fails to render", async () => {
      documents.renderAndStore.mockRejectedValue(new Error("storage down"));

      const result = await service.review(SCHOOL, SUBMISSION, ADMIN, { status: "VERIFIED" });

      expect(result).not.toHaveProperty("receiptUrl");
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("tells the parent on the phone channel and by push", async () => {
      await service.review(SCHOOL, SUBMISSION, ADMIN, { status: "VERIFIED" });

      // Routed through the school's chosen phone channel rather than
      // hard-coded to WhatsApp.
      expect(notifications.sendPhoneAlert).toHaveBeenCalledWith(
        SCHOOL,
        "+923001234567",
        expect.stringContaining("verified"),
      );
      expect(notifications.sendPush).toHaveBeenCalledWith([PARENT], expect.anything());
    });
  });

  // ---------- rejecting and asking for more ----------

  describe("review — REJECTED and NEEDS_INFO", () => {
    beforeEach(() => {
      prisma.paymentSubmission.findFirst.mockResolvedValue(submission());
    });

    it("records the reason and tells the parent what it was", async () => {
      await service.review(SCHOOL, SUBMISSION, ADMIN, {
        status: "REJECTED",
        rejectionReason: "SCREENSHOT_UNCLEAR",
      });

      expect(prisma.paymentSubmission.updateMany).toHaveBeenCalledWith({
        where: { id: SUBMISSION, schoolId: SCHOOL, status: { not: "VERIFIED" } },
        data: expect.objectContaining({
          status: "REJECTED",
          rejectionReason: "SCREENSHOT_UNCLEAR",
        }),
      });
      expect(notifications.sendPhoneAlert).toHaveBeenCalledWith(
        SCHOOL,
        "+923001234567",
        expect.stringContaining("SCREENSHOT_UNCLEAR"),
      );
    });

    it("cannot disown a payment another admin has just banked", async () => {
      prisma.paymentSubmission.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.review(SCHOOL, SUBMISSION, ADMIN, {
          status: "REJECTED",
          rejectionReason: "WRONG_ACCOUNT",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("passes the reviewer's question through to the parent", async () => {
      await service.review(SCHOOL, SUBMISSION, ADMIN, {
        status: "NEEDS_INFO",
        reviewNote: "Send the bank slip",
      });

      expect(prisma.paymentSubmission.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "NEEDS_INFO",
            reviewNote: "Send the bank slip",
          }),
        }),
      );
      expect(notifications.sendPhoneAlert).toHaveBeenCalledWith(
        SCHOOL,
        "+923001234567",
        expect.stringContaining("Send the bank slip"),
      );
    });

    it("does not fall over when the parent has no phone number on file", async () => {
      prisma.paymentSubmission.findFirst.mockResolvedValue(
        submission({ submittedByUser: { id: PARENT, phone: null } }),
      );

      await expect(
        service.review(SCHOOL, SUBMISSION, ADMIN, {
          status: "NEEDS_INFO",
          reviewNote: "Send the bank slip",
        }),
      ).resolves.toBeDefined();
      expect(notifications.sendPhoneAlert).toHaveBeenCalledWith(
        SCHOOL,
        null,
        expect.any(String),
      );
    });
  });
});
