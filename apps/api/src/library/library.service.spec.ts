import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { LibraryService } from "./library.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const BOOK = "book-1";
const STUDENT = "student-1";
const LOAN = "loan-1";
const DUE = new Date("2026-10-01T00:00:00.000Z");

describe("LibraryService", () => {
  let prisma: {
    book: { create: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    bookLoan: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
    };
    studentProfile: { findFirst: jest.Mock };
    $executeRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let service: LibraryService;

  beforeEach(() => {
    prisma = {
      book: {
        create: jest.fn().mockResolvedValue({ id: BOOK }),
        findFirst: jest.fn().mockResolvedValue({ id: BOOK }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: BOOK }),
      },
      bookLoan: {
        create: jest.fn().mockResolvedValue({ id: LOAN }),
        findFirst: jest.fn().mockResolvedValue({ returnedAt: null }),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: LOAN, bookId: BOOK }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      studentProfile: { findFirst: jest.fn().mockResolvedValue({ id: STUDENT }) },
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn().mockImplementation(async (arg) =>
        typeof arg === "function" ? arg(prisma) : Promise.all(arg),
      ),
    };
    service = new LibraryService(prisma as unknown as PrismaService);
  });

  describe("createBook", () => {
    it("opens every copy as available", async () => {
      await service.createBook(SCHOOL, {
        title: "Ibn Battuta",
        author: "Ross Dunn",
        totalCopies: 4,
      });

      expect(prisma.book.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ totalCopies: 4, availableCopies: 4 }),
      });
    });
  });

  describe("borrow", () => {
    it("claims the copy in the statement that checks it, not by reading first", async () => {
      await service.borrow(SCHOOL, { bookId: BOOK, studentId: STUDENT, dueAt: DUE });

      // The count is never read and compared in the service — the UPDATE's
      // WHERE clause decides, which is what makes two concurrent borrows safe.
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma.bookLoan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: SCHOOL,
          bookId: BOOK,
          studentId: STUDENT,
          dueAt: DUE,
        }),
      });
    });

    it("refuses the borrow that lost the race for the last copy", async () => {
      prisma.$executeRaw.mockResolvedValue(0);

      await expect(
        service.borrow(SCHOOL, { bookId: BOOK, studentId: STUDENT, dueAt: DUE }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.bookLoan.create).not.toHaveBeenCalled();
    });

    it("distinguishes an unknown book from an unavailable one", async () => {
      prisma.$executeRaw.mockResolvedValue(0);
      prisma.book.findFirst.mockResolvedValue(null);

      await expect(
        service.borrow(SCHOOL, { bookId: BOOK, studentId: STUDENT, dueAt: DUE }),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuses to lend to a student from another school", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.borrow(SCHOOL, { bookId: BOOK, studentId: STUDENT, dueAt: DUE }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe("returnBook", () => {
    it("gives the copy back only after closing the loan", async () => {
      await service.returnBook(SCHOOL, LOAN);

      expect(prisma.bookLoan.updateMany).toHaveBeenCalledWith({
        where: { id: LOAN, schoolId: SCHOOL, returnedAt: null },
        data: { returnedAt: expect.any(Date) },
      });
      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: BOOK },
        data: { availableCopies: { increment: 1 } },
      });
    });

    it("does not invent a copy when the same loan is returned twice at once", async () => {
      prisma.bookLoan.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.returnBook(SCHOOL, LOAN)).rejects.toThrow(BadRequestException);
      expect(prisma.book.update).not.toHaveBeenCalled();
    });

    it("reports an unknown loan as not found rather than already returned", async () => {
      prisma.bookLoan.updateMany.mockResolvedValue({ count: 0 });
      prisma.bookLoan.findFirst.mockResolvedValue(null);

      await expect(service.returnBook(SCHOOL, LOAN)).rejects.toThrow(NotFoundException);
    });

    it("will not close another school's loan", async () => {
      await service.returnBook(SCHOOL, LOAN);

      expect(prisma.bookLoan.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ schoolId: SCHOOL }) }),
      );
    });
  });
});
