import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { BorrowBookInput, CreateBookInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  createBook(schoolId: string, input: CreateBookInput) {
    return this.prisma.book.create({
      data: {
        schoolId,
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        totalCopies: input.totalCopies,
        availableCopies: input.totalCopies,
      },
    });
  }

  findBooks(schoolId: string) {
    return this.prisma.book.findMany({ where: { schoolId }, orderBy: { title: "asc" } });
  }

  /**
   * Lends one copy out.
   *
   * The copy is claimed by a conditional UPDATE rather than by reading
   * `availableCopies` and then decrementing it. Wrapping the read-then-write in
   * a transaction looks like it settles the question and doesn't: at Postgres'
   * default READ COMMITTED isolation two librarians issuing the last copy both
   * read `1`, both pass the check and both decrement, leaving the count at `-1`
   * and two students holding one book. Letting the WHERE clause do the
   * deciding means the second UPDATE matches no rows and is refused.
   *
   * Same shape as the hostel bed claim and the inventory stock reservation.
   */
  async borrow(schoolId: string, input: BorrowBookInput) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: input.studentId, schoolId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException("Student not found");

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.$executeRaw`
        UPDATE "Book"
        SET "availableCopies" = "availableCopies" - 1
        WHERE "id" = ${input.bookId}
          AND "schoolId" = ${schoolId}
          AND "availableCopies" > 0
      `;
      if (claimed === 0) {
        // Re-read only to tell the two failures apart for the message; the
        // decision was the database's and has already been made.
        const book = await tx.book.findFirst({
          where: { id: input.bookId, schoolId },
          select: { id: true },
        });
        if (!book) throw new NotFoundException("Book not found");
        throw new ConflictException("No copies available");
      }

      return tx.bookLoan.create({
        data: {
          schoolId,
          bookId: input.bookId,
          studentId: input.studentId,
          dueAt: input.dueAt,
        },
      });
    });
  }

  /**
   * Takes one copy back.
   *
   * The mirror of `borrow`, and it needs the same treatment: checking
   * `returnedAt` and then incrementing lets two concurrent returns of the same
   * loan both pass and both increment, pushing `availableCopies` above
   * `totalCopies` and inventing a copy the library doesn't own. Stamping
   * `returnedAt` with `returnedAt IS NULL` in the WHERE clause makes the loan
   * itself the thing being claimed, so only the caller that actually closed it
   * gives the copy back.
   */
  async returnBook(schoolId: string, loanId: string) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.bookLoan.updateMany({
        where: { id: loanId, schoolId, returnedAt: null },
        data: { returnedAt: new Date() },
      });
      if (claimed.count === 0) {
        const loan = await tx.bookLoan.findFirst({
          where: { id: loanId, schoolId },
          select: { returnedAt: true },
        });
        if (!loan) throw new NotFoundException("Loan not found");
        throw new BadRequestException("Already returned");
      }

      const loan = await tx.bookLoan.findUniqueOrThrow({
        where: { id: loanId },
      });
      await tx.book.update({
        where: { id: loan.bookId },
        data: { availableCopies: { increment: 1 } },
      });
      return loan;
    });
  }

  findLoansForStudent(schoolId: string, studentId: string) {
    return this.prisma.bookLoan.findMany({
      where: { schoolId, studentId },
      include: { book: true },
      orderBy: { borrowedAt: "desc" },
    });
  }
}
