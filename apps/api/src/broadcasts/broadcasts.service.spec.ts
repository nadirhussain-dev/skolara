import { NotFoundException } from "@nestjs/common";
import { BroadcastsService } from "./broadcasts.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";

const parent: AuthenticatedUser = { id: "p1", role: "PARENT", schoolId: "school-1" };

describe("BroadcastsService", () => {
  let prisma: {
    platformBroadcast: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    user: { findMany: jest.Mock };
  };
  let notifications: { sendPush: jest.Mock };
  let service: BroadcastsService;

  beforeEach(() => {
    prisma = {
      platformBroadcast: {
        create: jest.fn().mockResolvedValue({ id: "b1" }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: "b1" }),
        delete: jest.fn(),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: "u1" }, { id: "u2" }]) },
    };
    notifications = { sendPush: jest.fn() };
    service = new BroadcastsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  it("pushes to every active user when no audience is set", async () => {
    await service.create("root-1", { title: "Maintenance", body: "Sunday 2am", audienceRoles: [] });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true },
    });
    expect(notifications.sendPush).toHaveBeenCalledWith(["u1", "u2"], expect.anything());
  });

  it("pushes only to the named roles when an audience is set", async () => {
    await service.create("root-1", {
      title: "Billing change",
      body: "New rates from April",
      audienceRoles: ["SCHOOL_ADMIN"],
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { isActive: true, role: { in: ["SCHOOL_ADMIN"] } },
      select: { id: true },
    });
  });

  it("crosses tenants deliberately — no school scoping on the recipient query", async () => {
    await service.create("root-1", { title: "T", body: "B", audienceRoles: [] });
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("schoolId");
  });

  it("shows unexpired broadcasts addressed to everyone or to this role", async () => {
    await service.findActiveFor(parent);
    const where = prisma.platformBroadcast.findMany.mock.calls[0][0].where;

    // Unexpired: never expires, or expires in the future.
    expect(where.OR).toEqual([{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }]);
    // Addressed to everyone (empty list) or explicitly to PARENT.
    expect(where.AND[0].OR).toEqual([
      { audienceRoles: { isEmpty: true } },
      { audienceRoles: { has: "PARENT" } },
    ]);
  });

  it("truncates a long body for the push payload but keeps the record intact", async () => {
    const body = "x".repeat(500);
    await service.create("root-1", { title: "T", body, audienceRoles: [] });

    expect(notifications.sendPush).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: "x".repeat(160) }),
    );
    expect(prisma.platformBroadcast.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ body }) }),
    );
  });

  it("rejects withdrawing a broadcast that doesn't exist", async () => {
    prisma.platformBroadcast.findUnique.mockResolvedValue(null);
    await expect(service.withdraw("nope")).rejects.toBeInstanceOf(NotFoundException);
  });
});
