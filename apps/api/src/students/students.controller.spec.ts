import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type { ClassAccessService } from "../common/class-access.service";
import { StudentsController } from "./students.controller";
import type { StudentsService } from "./students.service";

const admin = { id: "a", role: "SCHOOL_ADMIN", schoolId: "school-1" } as AuthenticatedUser;
const teacher = { id: "t", role: "TEACHER", schoolId: "school-1" } as AuthenticatedUser;
const parent = { id: "p", role: "PARENT", schoolId: "school-1" } as AuthenticatedUser;
const student = { id: "s", role: "STUDENT", schoolId: "school-1" } as AuthenticatedUser;

describe("StudentsController rosters", () => {
  let service: { findAllForClass: jest.Mock; findChildrenForParent: jest.Mock; findOwnProfile: jest.Mock };
  let classAccess: { assertCanTeachClass: jest.Mock };
  let controller: StudentsController;

  beforeEach(() => {
    service = {
      findAllForClass: jest.fn().mockResolvedValue([]),
      findChildrenForParent: jest.fn().mockResolvedValue([]),
      findOwnProfile: jest.fn().mockResolvedValue([]),
    };
    classAccess = { assertCanTeachClass: jest.fn().mockResolvedValue(undefined) };
    controller = new StudentsController(
      service as unknown as StudentsService,
      classAccess as unknown as ClassAccessService,
    );
  });

  it("lets an admin list the whole school", async () => {
    await controller.findAllForClass(undefined, admin);
    expect(service.findAllForClass).toHaveBeenCalledWith("school-1", undefined);
    expect(classAccess.assertCanTeachClass).not.toHaveBeenCalled();
  });

  it("refuses a teacher asking for the whole school", async () => {
    await expect(controller.findAllForClass(undefined, teacher)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findAllForClass).not.toHaveBeenCalled();
  });

  it("gives a teacher a class roster only after checking they teach it", async () => {
    await controller.findAllForClass("class-1", teacher);
    expect(classAccess.assertCanTeachClass).toHaveBeenCalledWith(teacher, "class-1");
    expect(service.findAllForClass).toHaveBeenCalledWith("school-1", "class-1");
  });

  it("returns nothing to a teacher who is not assigned to the class", async () => {
    classAccess.assertCanTeachClass.mockRejectedValue(new ForbiddenException());
    await expect(controller.findAllForClass("class-2", teacher)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findAllForClass).not.toHaveBeenCalled();
  });

  it("gives a parent their children and a student only themself", async () => {
    await controller.findMine(parent);
    expect(service.findChildrenForParent).toHaveBeenCalledWith("p");
    await controller.findMine(student);
    expect(service.findOwnProfile).toHaveBeenCalledWith("s");
  });
});
