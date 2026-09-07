import { NotFoundException } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const OTHER_SCHOOL = "school-2";
const STUDENT = "student-1";
const INVOICE = "invoice-1";

const input = {
  schoolId: SCHOOL,
  studentId: STUDENT,
  term: "Term 1 2026",
  amountDue: 10000,
  dueDate: new Date("2026-10-15T00:00:00.000Z"),
};

describe("InvoicesService", () => {
  let prisma: {
    invoice: { create: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock };
    studentProfile: { findFirst: jest.Mock };
  };
  let service: InvoicesService;

  beforeEach(() => {
    prisma = {
      invoice: {
        create: jest.fn().mockResolvedValue({ id: INVOICE }),
        findFirst: jest.fn().mockResolvedValue({ id: INVOICE }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      studentProfile: { findFirst: jest.fn().mockResolvedValue({ id: STUDENT }) },
    };
    service = new InvoicesService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("raises the invoice once the student is confirmed to be in the school", async () => {
      await service.create(input);

      expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith({
        where: { id: STUDENT, schoolId: SCHOOL },
        select: { id: true },
      });
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: SCHOOL,
          studentId: STUDENT,
          amountDue: 10000,
        }),
      });
    });

    it("refuses to bill a student who belongs to another school", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue(null);

      await expect(service.create({ ...input, schoolId: OTHER_SCHOOL })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it("opens the invoice unpaid rather than taking a paid amount from the caller", async () => {
      await service.create(input);

      const [{ data }] = prisma.invoice.create.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(data).not.toHaveProperty("amountPaid");
      expect(data).not.toHaveProperty("status");
    });
  });

  describe("findAllForStudent", () => {
    it("scopes to the school and shows the invoice due soonest last", async () => {
      await service.findAllForStudent(SCHOOL, STUDENT);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: { schoolId: SCHOOL, studentId: STUDENT },
        orderBy: { dueDate: "desc" },
      });
    });
  });

  describe("findOne", () => {
    it("will not hand over an invoice from another school", async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.findOne(SCHOOL, INVOICE)).rejects.toThrow(NotFoundException);
    });
  });
});
