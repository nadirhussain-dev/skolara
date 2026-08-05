import { z } from "zod";

export const bookSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().nullable(),
  totalCopies: z.number().int().positive(),
  availableCopies: z.number().int().nonnegative(),
});
export type Book = z.infer<typeof bookSchema>;

export const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().optional(),
  totalCopies: z.number().int().positive(),
});
export type CreateBookInput = z.infer<typeof createBookSchema>;

export const bookLoanSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  bookId: z.string().uuid(),
  studentId: z.string().uuid(),
  borrowedAt: z.coerce.date(),
  dueAt: z.coerce.date(),
  returnedAt: z.coerce.date().nullable(),
});
export type BookLoan = z.infer<typeof bookLoanSchema>;

export const borrowBookSchema = z.object({
  bookId: z.string().uuid(),
  studentId: z.string().uuid(),
  dueAt: z.coerce.date(),
});
export type BorrowBookInput = z.infer<typeof borrowBookSchema>;
