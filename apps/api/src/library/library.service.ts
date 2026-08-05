import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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

  async borrow(schoolId: string, input: BorrowBookInput) {
    return this.prisma.$transaction(async (tx) => {
      const book = await tx.book.findFirst({ where: { id: input.bookId, schoolId } });
      if (!book) throw new NotFoundException("Book not found");
      if (book.availableCopies < 1) {
        throw new BadRequestException("No copies available");
      }

      await tx.book.update({
        where: { id: book.id },
        data: { availableCopies: { decrement: 1 } },
      });

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

  async returnBook(schoolId: string, loanId: string) {
    const loan = await this.prisma.bookLoan.findFirst({
      where: { id: loanId, schoolId },
    });
    if (!loan) throw new NotFoundException("Loan not found");
    if (loan.returnedAt) throw new BadRequestException("Already returned");

    return this.prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: loan.bookId },
        data: { availableCopies: { increment: 1 } },
      });
      return tx.bookLoan.update({
        where: { id: loanId },
        data: { returnedAt: new Date() },
      });
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
