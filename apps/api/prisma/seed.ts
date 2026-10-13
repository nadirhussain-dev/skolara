import { PrismaClient, type Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "changeme123";
const DEMO_SUBDOMAIN = "demo";

/**
 * Idempotent by construction: every write is an upsert keyed on something
 * stable, so re-running the seed against an existing database is a no-op
 * rather than a pile of duplicates or a unique-constraint crash.
 */
async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@skolara.app";
  await upsertUser({
    // Platform admins have no school; their uniqueness is enforced by the
    // partial index, so they're matched on email alone.
    schoolId: null,
    email: superAdminEmail,
    role: "SUPER_ADMIN",
    firstName: "Platform",
    lastName: "Owner",
    passwordHash,
  });

  const school = await prisma.school.upsert({
    where: { subdomain: DEMO_SUBDOMAIN },
    create: {
      name: "Skolara Demo School",
      subdomain: DEMO_SUBDOMAIN,
      plan: "STANDARD",
      subscriptionStatus: "ACTIVE",
      primaryColor: "#0F766E",
    },
    update: {},
  });

  const principal = await upsertUser({
    schoolId: school.id,
    email: "principal@demo.skolara.app",
    role: "SCHOOL_ADMIN",
    firstName: "Ayesha",
    lastName: "Khan",
    phone: "+923001234567",
    passwordHash,
  });

  const classes = await Promise.all(
    [
      { name: "Grade 6", section: "A" },
      { name: "Grade 7", section: "B" },
    ].map(({ name, section }) =>
      prisma.schoolClass.upsert({
        where: {
          schoolId_name_section_academicYear: {
            schoolId: school.id,
            name,
            section,
            academicYear: "2026",
          },
        },
        create: { schoolId: school.id, name, section, academicYear: "2026" },
        update: {},
      }),
    ),
  );

  const teachers = [
    { first: "Imran", last: "Sheikh", subjects: ["Mathematics", "Physics"] },
    { first: "Sana", last: "Malik", subjects: ["English", "History"] },
  ];

  for (const [index, teacher] of teachers.entries()) {
    const user = await upsertUser({
      schoolId: school.id,
      email: `teacher${index + 1}@demo.skolara.app`,
      role: "TEACHER",
      firstName: teacher.first,
      lastName: teacher.last,
      passwordHash,
    });

    await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        schoolId: school.id,
        employeeNumber: `EMP-${String(index + 1).padStart(3, "0")}`,
        subjects: teacher.subjects,
      },
      update: {},
    });

    // A teacher can only take registers and enter marks for classes they are
    // assigned to, so the demo teachers are assigned to every demo class.
    for (const schoolClass of classes) {
      await prisma.classTeacher.upsert({
        where: { classId_teacherUserId: { classId: schoolClass.id, teacherUserId: user.id } },
        create: { classId: schoolClass.id, teacherUserId: user.id },
        update: {},
      });
    }
  }

  const students = [
    { first: "Hassan", last: "Ali", parent: "Bilal Ali" },
    { first: "Fatima", last: "Ali", parent: "Bilal Ali" },
    { first: "Zainab", last: "Iqbal", parent: "Nadia Iqbal" },
    { first: "Usman", last: "Raza", parent: "Tariq Raza" },
  ];

  for (const [index, student] of students.entries()) {
    const [parentFirst, parentLast] = student.parent.split(" ");
    const parentEmail = `${parentFirst.toLowerCase()}.${parentLast.toLowerCase()}@example.com`;

    const parentUser = await upsertUser({
      schoolId: school.id,
      email: parentEmail,
      role: "PARENT",
      firstName: parentFirst,
      lastName: parentLast,
      phone: `+9230012345${String(70 + index).slice(-2)}`,
      passwordHash,
    });

    const studentUser = await upsertUser({
      schoolId: school.id,
      email: `student${index + 1}@demo.skolara.app`,
      role: "STUDENT",
      firstName: student.first,
      lastName: student.last,
      passwordHash,
    });

    const profile = await prisma.studentProfile.upsert({
      where: { userId: studentUser.id },
      create: {
        userId: studentUser.id,
        schoolId: school.id,
        classId: classes[index % classes.length].id,
        admissionNumber: `ADM-2026-${String(index + 1).padStart(4, "0")}`,
        // Roughly 11-14 years old, staggered so the demo data isn't a class
        // of identical birthdays.
        dateOfBirth: new Date(2013 - (index % 3), (index * 3) % 12, 1 + index),
      },
      update: {},
    });

    // Two of these students share a parent, so the app's multi-child switcher
    // has something real to switch between.
    await prisma.parentStudentLink.upsert({
      where: {
        parentUserId_studentId: { parentUserId: parentUser.id, studentId: profile.id },
      },
      create: { parentUserId: parentUser.id, studentId: profile.id },
      update: {},
    });

    // No unique key on invoices — a school can legitimately issue more than
    // one for the same term (tuition, then transport) — so match before
    // creating rather than upserting.
    const existingInvoice = await prisma.invoice.findFirst({
      where: { schoolId: school.id, studentId: profile.id, term: "Term 1 2026" },
      select: { id: true },
    });
    if (!existingInvoice) {
      await prisma.invoice.create({
        data: {
          schoolId: school.id,
          studentId: profile.id,
          term: "Term 1 2026",
          amountDue: 15000,
          amountPaid: 0,
          status: "UNPAID",
          dueDate: new Date("2026-09-30"),
        },
      });
    }
  }

  await seedFinance(school.id, principal.id);

  console.log(
    [
      "Seeded:",
      `  super admin     ${superAdminEmail} / ${DEMO_PASSWORD}`,
      `  school admin    principal@demo.skolara.app / ${DEMO_PASSWORD}`,
      `  teacher         teacher1@demo.skolara.app / ${DEMO_PASSWORD}`,
      `  parent          bilal.ali@example.com / ${DEMO_PASSWORD}  (two children)`,
      `  school          ${school.name} at ${DEMO_SUBDOMAIN}.skolara.app`,
    ].join("\n"),
  );
}

/**
 * A budget for the current month and a few expenses, so the Finance screens
 * have something to show: two inside budget, one over and waiting for a
 * decision.
 */
async function seedFinance(schoolId: string, raisedByUserId: string) {
  const budgets: [string, number][] = [
    ["Salaries", 400000],
    ["Rent", 120000],
    ["Utilities", 45000],
    ["Transport", 30000],
    ["Supplies", 25000],
    ["Maintenance", 20000],
    ["Other", 10000],
  ];
  await prisma.budgetCategory.createMany({
    data: budgets.map(([name]) => ({ schoolId, name })),
    skipDuplicates: true,
  });
  const categories = await prisma.budgetCategory.findMany({ where: { schoolId } });
  const idByName = new Map(categories.map((category) => [category.name, category.id]));

  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (const [name, amount] of budgets) {
    const categoryId = idByName.get(name);
    if (!categoryId) continue;
    await prisma.budgetLine.upsert({
      where: { categoryId_month: { categoryId, month } },
      create: { schoolId, categoryId, month, amount },
      update: {},
    });
  }

  // Expenses have no natural key, so only add them to a school that has none.
  if ((await prisma.expense.count({ where: { schoolId } })) > 0) return;
  const expenses: { category: string; payee: string; description: string; amount: number; approved: boolean }[] = [
    { category: "Salaries", payee: "Staff salaries", description: "Monthly payroll", amount: 400000, approved: true },
    { category: "Utilities", payee: "Electricity company", description: "Last month's bill", amount: 38000, approved: true },
    { category: "Supplies", payee: "City Printers", description: "Exam papers", amount: 31000, approved: false },
  ];
  for (const expense of expenses) {
    const categoryId = idByName.get(expense.category);
    if (!categoryId) continue;
    await prisma.expense.create({
      data: {
        schoolId,
        categoryId,
        payee: expense.payee,
        description: expense.description,
        amount: expense.amount,
        spentOn: month,
        raisedByUserId,
        status: expense.approved ? "APPROVED" : "PENDING",
        reviewedAt: expense.approved ? now : null,
        reviewNote: expense.approved ? "Within budget" : null,
      },
    });
  }
}

async function upsertUser(data: {
  schoolId: string | null;
  email: string;
  role: Prisma.UserCreateInput["role"];
  firstName: string;
  lastName: string;
  phone?: string;
  passwordHash: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { email: data.email, schoolId: data.schoolId },
    select: { id: true },
  });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { firstName: data.firstName, lastName: data.lastName, phone: data.phone },
    });
  }
  return prisma.user.create({ data });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
