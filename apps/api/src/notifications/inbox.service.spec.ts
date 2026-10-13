import type { PrismaService } from "../prisma/prisma.service";
import { InboxService } from "./inbox.service";

describe("InboxService", () => {
  let prisma: { notification: { findMany: jest.Mock; count: jest.Mock; updateMany: jest.Mock } };
  let service: InboxService;

  beforeEach(() => {
    prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "n1",
            userId: "me",
            title: "Fee received",
            body: "Rs 5,000 verified",
            data: { screen: "payments", count: 3, nested: { a: 1 } },
            readAt: null,
            createdAt: new Date("2026-10-10T08:00:00Z"),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new InboxService(prisma as unknown as PrismaService);
  });

  it("lists only the caller's notifications, newest first, capped", async () => {
    const result = await service.list("me");
    const args = prisma.notification.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "me" });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.take).toBe(50);
    expect(result.unreadCount).toBe(1);
  });

  it("passes through only string data values", async () => {
    const result = await service.list("me");
    expect(result.items[0]?.data).toEqual({ screen: "payments" });
  });

  it("marks only the caller's unread entries, even when given someone else's id", async () => {
    await service.markRead("me", ["n1", "someone-elses"]);
    expect(prisma.notification.updateMany.mock.calls[0][0].where).toEqual({
      userId: "me",
      readAt: null,
      id: { in: ["n1", "someone-elses"] },
    });
  });

  it("marks everything read when no ids are given", async () => {
    await service.markRead("me");
    expect(prisma.notification.updateMany.mock.calls[0][0].where).toEqual({
      userId: "me",
      readAt: null,
    });
  });
});
