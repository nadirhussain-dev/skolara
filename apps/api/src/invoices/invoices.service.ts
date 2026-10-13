import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  BulkInvoiceInput,
  BulkInvoiceResult,
  CreateInvoiceInput,
  Defaulter,
  InvoiceFilter,
  InvoiceList,
  InvoiceRow,
} from "@skolara/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Raises an invoice against a student.
   *
   * The controller has already refused a `schoolId` that isn't the caller's,
   * but that alone doesn't make the write tenant-safe: `studentId` is a
   * caller-supplied id too, and without this check an admin could bill a
   * student at another school — a row that then shows up in that family's app
   * and in the wrong school's collections.
   */
  async create(input: CreateInvoiceInput) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: input.studentId, schoolId: input.schoolId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException("Student not found");

    return this.prisma.invoice.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        term: input.term,
        amountDue: input.amountDue,
        dueDate: input.dueDate,
      },
    });
  }

  findAllForStudent(schoolId: string, studentId: string) {
    return this.prisma.invoice.findMany({
      where: { schoolId, studentId },
      orderBy: { dueDate: "desc" },
    });
  }

  async findOne(schoolId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, schoolId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  /**
   * Every invoice in the school, newest due date first, with totals for the
   * same filter. "Overdue" is worked out from the due date at read time, so
   * it is right even if nothing has updated the stored status.
   */
  async list(
    schoolId: string,
    filter: { status: InvoiceFilter; classId?: string },
    now: Date = new Date(),
  ): Promise<InvoiceList> {
    const rows = await this.prisma.invoice.findMany({
      where: {
        schoolId,
        ...(filter.classId ? { student: { classId: filter.classId } } : {}),
        ...(filter.status === "PAID" ? { status: "PAID" } : {}),
        ...(filter.status === "UNPAID" ? { status: { not: "PAID" } } : {}),
        ...(filter.status === "OVERDUE" ? { status: { not: "PAID" }, dueDate: { lt: now } } : {}),
      },
      include: {
        student: {
          select: {
            admissionNumber: true,
            classId: true,
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true, section: true } },
          },
        },
      },
      orderBy: [{ dueDate: "desc" }, { id: "asc" }],
      // A ceiling, not a page: a 2,000-pupil school billed monthly is within it
      // once filtered by class or status.
      take: 2000,
    });

    const invoices: InvoiceRow[] = rows.map((row) => {
      const amountDue = Number(row.amountDue);
      const amountPaid = Number(row.amountPaid);
      const balance = Math.max(0, Math.round((amountDue - amountPaid) * 100) / 100);
      return {
        id: row.id,
        schoolId: row.schoolId,
        studentId: row.studentId,
        term: row.term,
        amountDue,
        amountPaid,
        status: row.status,
        dueDate: row.dueDate,
        studentName: `${row.student.user.firstName} ${row.student.user.lastName}`.trim(),
        admissionNumber: row.student.admissionNumber,
        classId: row.student.classId,
        className: row.student.class?.name ?? null,
        classSection: row.student.class?.section ?? null,
        balance,
        overdue: row.status !== "PAID" && balance > 0 && row.dueDate < now,
      };
    });

    const paisa = (n: number) => Math.round(n * 100);
    const sum = (values: number[]) => values.reduce((a, b) => a + paisa(b), 0) / 100;
    const overdue = invoices.filter((i) => i.overdue);
    return {
      invoices,
      totals: {
        invoiced: sum(invoices.map((i) => i.amountDue)),
        collected: sum(invoices.map((i) => Math.min(i.amountPaid, i.amountDue))),
        outstanding: sum(invoices.map((i) => i.balance)),
        overdue: sum(overdue.map((i) => i.balance)),
        overdueCount: overdue.length,
      },
    };
  }

  /**
   * Raises the same invoice for every student in a class, or in the school.
   * A student who already has an invoice for the term is skipped, so running
   * it twice, or after a few were raised by hand, never double-bills anyone.
   */
  async createBulk(schoolId: string, input: BulkInvoiceInput): Promise<BulkInvoiceResult> {
    if (input.classId) {
      const owned = await this.prisma.schoolClass.findFirst({
        where: { id: input.classId, schoolId },
        select: { id: true },
      });
      if (!owned) throw new NotFoundException("Class not found");
    }

    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        user: { isActive: true },
        ...(input.classId ? { classId: input.classId } : {}),
      },
      select: { id: true },
    });
    if (students.length === 0) return { created: 0, skipped: 0 };

    const already = await this.prisma.invoice.findMany({
      where: { schoolId, term: input.term, studentId: { in: students.map((s) => s.id) } },
      select: { studentId: true },
    });
    const billed = new Set(already.map((i) => i.studentId));
    const toBill = students.filter((s) => !billed.has(s.id));

    if (toBill.length > 0) {
      await this.prisma.invoice.createMany({
        data: toBill.map((s) => ({
          schoolId,
          studentId: s.id,
          term: input.term,
          amountDue: input.amountDue,
          dueDate: input.dueDate,
        })),
      });
    }
    return { created: toBill.length, skipped: students.length - toBill.length };
  }

  /** Students with a balance past its due date, largest amount first. */
  async defaulters(schoolId: string, now: Date = new Date()): Promise<Defaulter[]> {
    const { invoices } = await this.list(schoolId, { status: "OVERDUE" }, now);
    const overdue = invoices.filter((i) => i.overdue);
    if (overdue.length === 0) return [];

    const links = await this.prisma.parentStudentLink.findMany({
      where: {
        studentId: { in: [...new Set(overdue.map((i) => i.studentId))] },
        student: { schoolId },
        parentUser: { isActive: true },
      },
      select: { studentId: true },
    });
    const parentCount = new Map<string, number>();
    for (const link of links) parentCount.set(link.studentId, (parentCount.get(link.studentId) ?? 0) + 1);

    const byStudent = new Map<string, Defaulter & { paisa: number }>();
    for (const inv of overdue) {
      const entry = byStudent.get(inv.studentId);
      if (entry) {
        entry.paisa += Math.round(inv.balance * 100);
        entry.overdueInvoiceCount += 1;
        if (inv.dueDate < entry.oldestDueDate) entry.oldestDueDate = inv.dueDate;
      } else {
        byStudent.set(inv.studentId, {
          studentId: inv.studentId,
          studentName: inv.studentName,
          admissionNumber: inv.admissionNumber,
          className: inv.className,
          classSection: inv.classSection,
          overdueAmount: 0,
          paisa: Math.round(inv.balance * 100),
          overdueInvoiceCount: 1,
          oldestDueDate: inv.dueDate,
          parentCount: parentCount.get(inv.studentId) ?? 0,
        });
      }
    }
    return [...byStudent.values()]
      .map(({ paisa, ...rest }) => ({ ...rest, overdueAmount: paisa / 100 }))
      .sort((a, b) => b.overdueAmount - a.overdueAmount);
  }

  /**
   * Sends a fee reminder, inside the app, to the parents of the given
   * students. Only students who really are overdue in this school are
   * reminded, whatever ids the caller sends.
   */
  async remind(schoolId: string, studentIds: string[]): Promise<{ reminded: number; withoutParent: number }> {
    const wanted = new Set(studentIds);
    const targets = (await this.defaulters(schoolId)).filter((d) => wanted.has(d.studentId));
    if (targets.length === 0) return { reminded: 0, withoutParent: 0 };

    const links = await this.prisma.parentStudentLink.findMany({
      where: {
        studentId: { in: targets.map((d) => d.studentId) },
        student: { schoolId },
        parentUser: { isActive: true },
      },
      select: { studentId: true, parentUserId: true },
    });
    const parents = new Map<string, string[]>();
    for (const link of links) {
      parents.set(link.studentId, [...(parents.get(link.studentId) ?? []), link.parentUserId]);
    }

    let reminded = 0;
    for (const target of targets) {
      const userIds = parents.get(target.studentId) ?? [];
      if (userIds.length === 0) continue;
      reminded += 1;
      await this.notifications.sendPush(userIds, {
        title: "Fee reminder",
        body: `${target.studentName}: Rs ${target.overdueAmount.toLocaleString("en-PK")} is past due. Please pay and upload the receipt in the app.`,
        data: { type: "FEE_REMINDER", studentId: target.studentId },
      });
    }
    return { reminded, withoutParent: targets.length - reminded };
  }
}
