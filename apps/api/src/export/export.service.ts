import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { toCsv } from "../reports/csv";

/**
 * A school's own data, in a form it can take elsewhere.
 *
 * Commercially this removes the lock-in objection during a sale; practically
 * it is the thing a school asks for the week it decides to leave, and a
 * platform that can't answer looks like it is holding the data hostage.
 *
 * ## Allowlist, not denylist
 *
 * Every table below names the columns it exports. That is the whole security
 * design. A denylist — "export the row, strip `passwordHash`" — means every
 * column added in future ships by default, and the day someone adds a
 * `recoveryAnswer` it leaves in the next export with nobody noticing. With an
 * allowlist the failure mode of forgetting is a missing column somebody
 * complains about, not a disclosure nobody sees.
 *
 * Deliberately absent, and why:
 *   - `User.passwordHash`, `RefreshToken`, `PasswordResetToken` — credentials.
 *     A password hash is not "the school's data" in any useful sense and is
 *     worth stealing.
 *   - `ApiKey.hashedKey` — same. The key's name and prefix are exported so an
 *     admin can see which integrations existed.
 *   - `DeviceToken` — push addresses for a person's handset, useless outside
 *     this deployment and abusable inside it.
 *   - `SupportTicketComment.internal` rows — platform-side working notes, kept
 *     from the school in the support service too. An export is not a back door
 *     into them.
 *   - `BusLocationPing`, `AuditLog` — high-volume operational logs rather than
 *     school records. Audit history is readable through its own paginated
 *     endpoint; putting it here would make the bundle mostly log.
 */

/** One exported table: where it comes from and exactly which columns leave. */
interface TableSpec {
  name: string;
  fetch: (schoolId: string) => Promise<Record<string, unknown>[]>;
}

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  private tables(): TableSpec[] {
    const p = this.prisma;
    const bySchool = (schoolId: string) => ({ schoolId });

    return [
      {
        name: "users",
        fetch: (schoolId) =>
          p.user.findMany({
            where: bySchool(schoolId),
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              isActive: true,
              createdAt: true,
            },
          }),
      },
      {
        name: "classes",
        fetch: (schoolId) =>
          p.schoolClass.findMany({
            where: bySchool(schoolId),
            orderBy: [{ academicYear: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              section: true,
              academicYear: true,
              classTeacherId: true,
            },
          }),
      },
      {
        name: "students",
        fetch: (schoolId) =>
          p.studentProfile.findMany({
            where: bySchool(schoolId),
            orderBy: { admissionNumber: "asc" },
            select: {
              id: true,
              userId: true,
              classId: true,
              admissionNumber: true,
              dateOfBirth: true,
            },
          }),
      },
      {
        name: "teachers",
        fetch: (schoolId) =>
          p.teacherProfile.findMany({
            where: bySchool(schoolId),
            orderBy: { employeeNumber: "asc" },
            select: { id: true, userId: true, employeeNumber: true, subjects: true },
          }),
      },
      {
        name: "parent_links",
        fetch: (schoolId) =>
          p.parentStudentLink.findMany({
            where: { student: bySchool(schoolId) },
            select: { parentUserId: true, studentId: true },
          }),
      },
      {
        name: "class_teachers",
        fetch: (schoolId) =>
          p.classTeacher.findMany({
            where: { class: bySchool(schoolId) },
            select: { classId: true, teacherUserId: true },
          }),
      },
      {
        name: "attendance",
        fetch: (schoolId) =>
          p.attendanceRecord.findMany({
            where: bySchool(schoolId),
            orderBy: { date: "asc" },
            select: {
              id: true,
              classId: true,
              studentId: true,
              date: true,
              status: true,
              markedByUserId: true,
            },
          }),
      },
      {
        name: "invoices",
        fetch: (schoolId) =>
          p.invoice.findMany({
            where: bySchool(schoolId),
            orderBy: { dueDate: "asc" },
            select: {
              id: true,
              studentId: true,
              term: true,
              amountDue: true,
              amountPaid: true,
              dueDate: true,
              status: true,
            },
          }),
      },
      {
        name: "payment_submissions",
        fetch: (schoolId) =>
          p.paymentSubmission.findMany({
            where: bySchool(schoolId),
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              referenceId: true,
              studentId: true,
              invoiceId: true,
              submittedByUserId: true,
              amountClaimed: true,
              status: true,
              rejectionReason: true,
              reviewNote: true,
              reviewedByUserId: true,
              reviewedAt: true,
              // URLs, not bytes. Called out in the manifest so nobody
              // discovers after cancelling that the files went with the
              // account.
              screenshotUrl: true,
              receiptUrl: true,
              createdAt: true,
            },
          }),
      },
      {
        name: "bank_statement_lines",
        fetch: (schoolId) =>
          p.bankStatementLine.findMany({
            where: bySchool(schoolId),
            orderBy: { transactionDate: "asc" },
          }),
      },
      {
        name: "grades",
        fetch: (schoolId) =>
          p.gradeEntry.findMany({
            where: bySchool(schoolId),
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              studentId: true,
              classId: true,
              subject: true,
              term: true,
              examType: true,
              marksObtained: true,
              maxMarks: true,
              comments: true,
              gradedByUserId: true,
              createdAt: true,
            },
          }),
      },
      {
        name: "exams",
        fetch: (schoolId) => p.exam.findMany({ where: bySchool(schoolId) }),
      },
      {
        name: "notices",
        fetch: (schoolId) =>
          p.notice.findMany({ where: bySchool(schoolId), orderBy: { createdAt: "asc" } }),
      },
      {
        name: "assignments",
        fetch: (schoolId) =>
          p.assignment.findMany({ where: bySchool(schoolId), orderBy: { dueDate: "asc" } }),
      },
      {
        name: "assignment_submissions",
        fetch: (schoolId) =>
          p.assignmentSubmission.findMany({
            where: { assignment: bySchool(schoolId) },
            orderBy: { submittedAt: "asc" },
          }),
      },
      {
        name: "study_materials",
        fetch: (schoolId) =>
          p.studyMaterial.findMany({
            where: bySchool(schoolId),
            orderBy: { createdAt: "asc" },
          }),
      },
      {
        name: "quizzes",
        fetch: (schoolId) =>
          p.quiz.findMany({ where: bySchool(schoolId), orderBy: { createdAt: "asc" } }),
      },
      {
        name: "quiz_questions",
        // Includes the answer key. The school wrote the papers; withholding
        // their own marking scheme from their own export would be absurd.
        fetch: (schoolId) =>
          p.quizQuestion.findMany({
            where: { quiz: bySchool(schoolId) },
            orderBy: [{ quizId: "asc" }, { sortOrder: "asc" }],
          }),
      },
      {
        name: "quiz_attempts",
        fetch: (schoolId) =>
          p.quizAttempt.findMany({
            where: bySchool(schoolId),
            orderBy: { startedAt: "asc" },
          }),
      },
      {
        name: "quiz_answers",
        fetch: (schoolId) =>
          p.quizAnswer.findMany({
            where: { attempt: bySchool(schoolId) },
            orderBy: { answeredAt: "asc" },
          }),
      },
      {
        name: "syllabus_topics",
        fetch: (schoolId) =>
          p.syllabusTopic.findMany({
            where: bySchool(schoolId),
            orderBy: [{ subject: "asc" }, { sortOrder: "asc" }],
          }),
      },
      {
        name: "lesson_plans",
        fetch: (schoolId) =>
          p.lessonPlan.findMany({ where: bySchool(schoolId), orderBy: { date: "asc" } }),
      },
      {
        name: "live_classes",
        fetch: (schoolId) =>
          p.liveClass.findMany({ where: bySchool(schoolId), orderBy: { startsAt: "asc" } }),
      },
      {
        name: "periods",
        fetch: (schoolId) =>
          p.period.findMany({ where: bySchool(schoolId), orderBy: { sortOrder: "asc" } }),
      },
      {
        name: "timetable_entries",
        fetch: (schoolId) => p.timetableEntry.findMany({ where: bySchool(schoolId) }),
      },
      {
        name: "calendar_events",
        fetch: (schoolId) =>
          p.calendarEvent.findMany({ where: bySchool(schoolId), orderBy: { startsAt: "asc" } }),
      },
      {
        name: "messages",
        fetch: (schoolId) =>
          p.message.findMany({
            where: { thread: bySchool(schoolId) },
            orderBy: { createdAt: "asc" },
          }),
      },
      {
        name: "message_threads",
        fetch: (schoolId) => p.messageThread.findMany({ where: bySchool(schoolId) }),
      },
      {
        name: "complaints",
        fetch: (schoolId) =>
          p.complaint.findMany({ where: bySchool(schoolId), orderBy: { createdAt: "asc" } }),
      },
      {
        name: "complaint_comments",
        fetch: (schoolId) =>
          p.complaintComment.findMany({
            where: { complaint: bySchool(schoolId) },
            orderBy: { createdAt: "asc" },
          }),
      },
      {
        name: "support_tickets",
        fetch: (schoolId) =>
          p.supportTicket.findMany({ where: bySchool(schoolId), orderBy: { createdAt: "asc" } }),
      },
      {
        name: "support_ticket_comments",
        // Internal platform notes are excluded here exactly as they are in the
        // support service. An export is not a way round that filter.
        fetch: (schoolId) =>
          p.supportTicketComment.findMany({
            where: { ticket: bySchool(schoolId), internal: false },
            orderBy: { createdAt: "asc" },
          }),
      },
      {
        name: "leave_requests",
        fetch: (schoolId) =>
          p.leaveRequest.findMany({ where: bySchool(schoolId), orderBy: { startDate: "asc" } }),
      },
      {
        name: "meeting_slots",
        fetch: (schoolId) =>
          p.meetingSlot.findMany({ where: bySchool(schoolId), orderBy: { startsAt: "asc" } }),
      },
      {
        name: "payslips",
        fetch: (schoolId) =>
          p.payslip.findMany({ where: bySchool(schoolId), orderBy: { generatedAt: "asc" } }),
      },
      {
        name: "books",
        fetch: (schoolId) => p.book.findMany({ where: bySchool(schoolId) }),
      },
      {
        name: "book_loans",
        fetch: (schoolId) =>
          p.bookLoan.findMany({ where: bySchool(schoolId), orderBy: { borrowedAt: "asc" } }),
      },
      {
        name: "buses",
        fetch: (schoolId) => p.bus.findMany({ where: bySchool(schoolId) }),
      },
      {
        name: "bus_assignments",
        fetch: (schoolId) =>
          p.busAssignment.findMany({ where: { bus: bySchool(schoolId) } }),
      },
      {
        name: "hostel_rooms",
        fetch: (schoolId) =>
          p.hostelRoom.findMany({
            where: bySchool(schoolId),
            orderBy: [{ blockName: "asc" }, { roomNumber: "asc" }],
          }),
      },
      {
        name: "hostel_allocations",
        fetch: (schoolId) =>
          p.hostelAllocation.findMany({
            where: bySchool(schoolId),
            orderBy: { allocatedAt: "asc" },
          }),
      },
      {
        name: "inventory_items",
        fetch: (schoolId) =>
          p.inventoryItem.findMany({
            where: bySchool(schoolId),
            orderBy: [{ category: "asc" }, { name: "asc" }],
          }),
      },
      {
        name: "asset_assignments",
        fetch: (schoolId) =>
          p.assetAssignment.findMany({
            where: bySchool(schoolId),
            orderBy: { assignedAt: "asc" },
          }),
      },
      {
        name: "api_keys",
        // Name and prefix only — the hash is a credential, and the point of
        // hashing it was that nobody can read it back.
        fetch: (schoolId) =>
          p.apiKey.findMany({
            where: bySchool(schoolId),
            select: {
              id: true,
              name: true,
              keyPrefix: true,
              lastUsedAt: true,
              revokedAt: true,
              createdAt: true,
            },
          }),
      },
    ];
  }

  /** The table names a caller may ask for as CSV. */
  tableNames(): string[] {
    return this.tables().map((table) => table.name);
  }

  /**
   * The whole bundle, in memory.
   *
   * Fine at the scale this product targets — a few thousand students, tens of
   * thousands of rows. It would not be fine for a chain of fifty schools, and
   * the honest fix there is a streamed or queued export rather than a bigger
   * server. Called out here so the limit is a known one.
   */
  async bundle(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        logoUrl: true,
        primaryColor: true,
        schoolGroupId: true,
        createdAt: true,
      },
    });
    if (!school) throw new NotFoundException("School not found");

    const specs = this.tables();
    const results = await Promise.all(specs.map((spec) => spec.fetch(schoolId)));

    const data: Record<string, Record<string, unknown>[]> = {};
    const rowCounts: Record<string, number> = {};
    specs.forEach((spec, index) => {
      data[spec.name] = results[index];
      rowCounts[spec.name] = results[index].length;
    });

    return {
      manifest: {
        school,
        exportedAt: new Date().toISOString(),
        formatVersion: 1,
        rowCounts,
        totalRows: Object.values(rowCounts).reduce((sum, count) => sum + count, 0),
        notes: [
          "Uploaded files (payment screenshots, homework, materials, generated PDFs) are referenced by URL, not embedded. Download them before the account closes.",
          "Credentials are excluded by design: password hashes, refresh tokens, API key secrets and push tokens are not exportable.",
          "Platform-internal support notes and operational logs (audit trail, bus location pings) are not included; the audit trail has its own endpoint.",
        ],
      },
      data,
    };
  }

  /**
   * One table as CSV, for the half of this that gets opened in a spreadsheet
   * rather than parsed.
   *
   * Columns come from the first row's keys. Every row from one Prisma select
   * has the same shape, so that is stable — but an empty table has no shape at
   * all, hence the header-only fallback.
   */
  async tableCsv(schoolId: string, name: string): Promise<string> {
    const spec = this.tables().find((table) => table.name === name);
    if (!spec) throw new NotFoundException(`No exportable table called "${name}"`);

    const rows = await spec.fetch(schoolId);
    if (rows.length === 0) return toCsv([name], []);

    const headers = Object.keys(rows[0]);
    return toCsv(
      headers,
      rows.map((row) => headers.map((header) => flatten(row[header]))),
    );
  }
}

/** CSV cells are scalars; anything structured is JSON so nothing is lost. */
function flatten(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
