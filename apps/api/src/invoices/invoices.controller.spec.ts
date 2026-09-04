import { ForbiddenException } from "@nestjs/common";
import { InvoicesController } from "./invoices.controller";
import type { InvoicesService } from "./invoices.service";
import type { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";

const SCHOOL = "school-1";
const STUDENT = "student-1";

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser =>
  ({ id: "parent-1", schoolId: SCHOOL, role: "PARENT", ...overrides }) as AuthenticatedUser;

describe("InvoicesController", () => {
  let invoices: { create: jest.Mock; findAllForStudent: jest.Mock };
  let studentAccess: { assertCanAccessStudent: jest.Mock };
  let controller: InvoicesController;

  beforeEach(() => {
    invoices = {
      create: jest.fn().mockResolvedValue({ id: "invoice-1" }),
      findAllForStudent: jest.fn().mockResolvedValue([]),
    };
    studentAccess = { assertCanAccessStudent: jest.fn() };
    controller = new InvoicesController(
      invoices as unknown as InvoicesService,
      studentAccess as unknown as StudentAccessService,
    );
  });

  const body = {
    schoolId: SCHOOL,
    studentId: STUDENT,
    term: "Term 1 2026",
    amountDue: 10000,
    dueDate: new Date("2026-10-15T00:00:00.000Z"),
  };

  describe("create", () => {
    it("refuses to bill into another school even for a school admin", () => {
      expect(() =>
        controller.create(body, user({ role: "SCHOOL_ADMIN", schoolId: "school-2" })),
      ).toThrow(ForbiddenException);
      expect(invoices.create).not.toHaveBeenCalled();
    });
  });

  describe("findForStudent", () => {
    it("checks the caller is entitled to this student before reading their fees", async () => {
      await controller.findForStudent(STUDENT, user());

      expect(studentAccess.assertCanAccessStudent).toHaveBeenCalledWith(
        expect.objectContaining({ id: "parent-1" }),
        STUDENT,
      );
      expect(invoices.findAllForStudent).toHaveBeenCalledWith(SCHOOL, STUDENT);
    });

    it("does not read another family's fee balance when the check refuses", async () => {
      studentAccess.assertCanAccessStudent.mockRejectedValue(
        new ForbiddenException("Not your child's record"),
      );

      await expect(controller.findForStudent(STUDENT, user())).rejects.toThrow(
        ForbiddenException,
      );
      expect(invoices.findAllForStudent).not.toHaveBeenCalled();
    });
  });
});
