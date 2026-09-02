import { UsersService } from "./users.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("UsersService.staffDirectory", () => {
  let prisma: { user: { findMany: jest.Mock } };
  let service: UsersService;

  beforeEach(() => {
    prisma = { user: { findMany: jest.fn().mockResolvedValue([]) } };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  it("returns staff only, never parents or students", async () => {
    await service.staffDirectory("school-1");

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: "school-1", role: { in: ["SCHOOL_ADMIN", "TEACHER"] } },
      }),
    );
  });

  it("scopes to the caller's school", async () => {
    await service.staffDirectory("school-1");
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.schoolId).toBe("school-1");
  });

  it("never selects the password hash", async () => {
    await service.staffDirectory("school-1");
    const select = prisma.user.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("passwordHash");
    expect(select.email).toBe(true);
  });
});
