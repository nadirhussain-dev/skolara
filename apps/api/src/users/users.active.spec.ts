import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";

describe("UsersService.setActive", () => {
  let prisma: {
    user: { findFirst: jest.Mock; update: jest.Mock };
    refreshToken: { updateMany: jest.Mock };
  };
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: "target" }),
        update: jest.fn().mockResolvedValue({ id: "target", isActive: false }),
      },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  it("refuses to let an admin switch off their own account", async () => {
    await expect(service.setActive("school-1", "me", false, "me")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("revokes the account's sessions when it is switched off", async () => {
    await service.setActive("school-1", "target", false, "me");
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "target", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("leaves sessions alone when switching an account back on", async () => {
    await service.setActive("school-1", "target", true, "me");
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("cannot touch an account in another school", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.setActive("school-1", "theirs", false, "me")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
