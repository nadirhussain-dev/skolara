"use client";

import {
  useApiClient,
  useBooks,
  useBorrowBook,
  useCreateBook,
  useLoansForStudent,
  useReturnBook,
  useStudentsByClass,
} from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader, Select } from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function LibraryPage() {
  const api = useApiClient();
  const { data: books, isLoading: booksLoading } = useBooks();
  const createBook = useCreateBook();
  const borrowBook = useBorrowBook();
  const returnBook = useReturnBook();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [totalCopies, setTotalCopies] = useState("1");

  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });
  const [classId, setClassId] = useState("");
  const { data: students } = useStudentsByClass(classId);
  const [studentId, setStudentId] = useState("");
  const { data: loans, isLoading: loansLoading } = useLoansForStudent(studentId || undefined);

  const [bookId, setBookId] = useState("");
  const [dueAt, setDueAt] = useState("");

  async function handleCreateBook(e: React.FormEvent) {
    e.preventDefault();
    await createBook.mutateAsync({
      title,
      author,
      isbn: isbn || undefined,
      totalCopies: Number(totalCopies),
    });
    setTitle("");
    setAuthor("");
    setIsbn("");
    setTotalCopies("1");
  }

  async function handleBorrow(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !bookId) return;
    await borrowBook.mutateAsync({ bookId, studentId, dueAt: new Date(dueAt) });
    setBookId("");
    setDueAt("");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Library" description="Manage the catalog and track book loans." />
      <Card>
        <CardHeader>
          <CardTitle>Add a book</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreateBook} className="flex flex-wrap gap-3">
          <Input
            placeholder="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="Author"
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="max-w-[180px]"
          />
          <Input
            placeholder="ISBN (optional)"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            type="number"
            min="1"
            placeholder="Copies"
            required
            value={totalCopies}
            onChange={(e) => setTotalCopies(e.target.value)}
            className="max-w-[100px]"
          />
          <Button type="submit" disabled={createBook.isPending}>
            {createBook.isPending ? "Adding..." : "Add book"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
        </CardHeader>
        {booksLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {books?.length === 0 && (
          <EmptyState title="No books yet" description="Add your first book above." />
        )}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {books?.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{b.title}</p>
                <p className="text-sm text-slate-500">
                  {b.author}
                  {b.isbn ? ` · ${b.isbn}` : ""}
                </p>
              </div>
              <span className="text-sm text-slate-500">
                {b.availableCopies} / {b.totalCopies} available
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loans</CardTitle>
        </CardHeader>
        <div className="mb-4 flex flex-wrap gap-3">
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setStudentId("");
            }}
            className="max-w-xs"
          >
            <option value="">Select class</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.section}
              </option>
            ))}
          </Select>
          <Select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="max-w-xs"
            disabled={!classId}
          >
            <option value="">Select student</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.firstName} {s.user.lastName} ({s.admissionNumber})
              </option>
            ))}
          </Select>
        </div>

        {studentId && (
          <>
            <form onSubmit={handleBorrow} className="mb-4 flex flex-wrap gap-3">
              <Select
                required
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                className="max-w-xs"
              >
                <option value="">Select book to borrow</option>
                {books
                  ?.filter((b) => b.availableCopies > 0)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
              </Select>
              <Input
                type="date"
                required
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="max-w-[160px]"
              />
              <Button type="submit" disabled={borrowBook.isPending}>
                {borrowBook.isPending ? "Borrowing..." : "Borrow"}
              </Button>
            </form>

            {loansLoading && <p className="text-sm text-slate-500">Loading...</p>}
            {loans?.length === 0 && <EmptyState title="No loans for this student" />}
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {loans?.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{loan.book.title}</p>
                    <p className="text-sm text-slate-500">
                      Borrowed {new Date(loan.borrowedAt).toLocaleDateString()} · Due{" "}
                      {new Date(loan.dueAt).toLocaleDateString()}
                    </p>
                  </div>
                  {loan.returnedAt ? (
                    <Badge tone="success">Returned</Badge>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => returnBook.mutate(loan.id)}
                      disabled={returnBook.isPending}
                    >
                      Mark returned
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
