import { ForbiddenException } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import type { AttendanceService } from "./attendance.service";
import type { ClassAccessService } from "../common/class-access.service";
import type { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";

const SCHOOL = "school-1";
const CLASS = "class-1";
const STUDENT = "student-1";

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser =>
  ({ id: "parent-1", schoolId: SCHOOL, role: "PARENT", ...overrides }) as AuthenticatedUser;

describe("AttendanceController", () => {
  let attendance: {
    markAttendance: jest.Mock;
    findByClassAndDate: jest.Mock;
    findForStudent: jest.Mock;
    schoolDaySummary: jest.Mock;
  };
  let classAccess: { assertCanTeachClass: jest.Mock };
  let studentAccess: { assertCanAccessStudent: jest.Mock };
  let controller: AttendanceController;

  beforeEach(() => {
    attendance = {
      markAttendance: jest.fn().mockResolvedValue([]),
      findByClassAndDate: jest.fn().mockResolvedValue([]),
      findForStudent: jest.fn().mockResolvedValue([]),
      schoolDaySummary: jest.fn().mockResolvedValue({}),
    };
    classAccess = { assertCanTeachClass: jest.fn() };
    studentAccess = { assertCanAccessStudent: jest.fn() };
    controller = new AttendanceController(
      attendance as unknown as AttendanceService,
      classAccess as unknown as ClassAccessService,
      studentAccess as unknown as StudentAccessService,
    );
  });

  describe("mark", () => {
    it("checks the caller teaches the class before taking the register", async () => {
      const body = { classId: CLASS, date: new Date(), markedOffline: false, entries: [] };

      await controller.mark(body, user({ role: "TEACHER", id: "teacher-1" }));

      expect(classAccess.assertCanTeachClass).toHaveBeenCalledWith(
        expect.objectContaining({ id: "teacher-1" }),
        CLASS,
      );
      expect(attendance.markAttendance).toHaveBeenCalledWith(SCHOOL, "teacher-1", body);
    });

    it("does not write a register for a class the caller doesn't teach", async () => {
      classAccess.assertCanTeachClass.mockRejectedValue(new ForbiddenException("Not your class"));

      await expect(
        controller.mark(
          { classId: CLASS, date: new Date(), markedOffline: false, entries: [] },
          user({ role: "TEACHER" }),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(attendance.markAttendance).not.toHaveBeenCalled();
    });
  });

  describe("findForStudent", () => {
    it("checks the caller is entitled to this child before reading their history", async () => {
      await controller.findForStudent(STUDENT, user());

      expect(studentAccess.assertCanAccessStudent).toHaveBeenCalledWith(
        expect.objectContaining({ id: "parent-1" }),
        STUDENT,
      );
      expect(attendance.findForStudent).toHaveBeenCalledWith(SCHOOL, STUDENT);
    });

    it("does not read another child's absences when the check refuses", async () => {
      studentAccess.assertCanAccessStudent.mockRejectedValue(
        new ForbiddenException("Not your child's record"),
      );

      await expect(controller.findForStudent(STUDENT, user())).rejects.toThrow(ForbiddenException);
      expect(attendance.findForStudent).not.toHaveBeenCalled();
    });
  });
});
