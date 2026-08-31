import { NotificationsService } from "./notifications.service";
import type { EmailProvider } from "./email-provider.interface";
import type { PushProvider } from "./push-provider.interface";
import type { WhatsAppProvider } from "./whatsapp-provider.interface";
import type { PrismaService } from "../prisma/prisma.service";

describe("NotificationsService.sendPush", () => {
  let push: { send: jest.Mock };
  let prisma: {
    deviceToken: { findMany: jest.Mock; deleteMany: jest.Mock };
  };
  let service: NotificationsService;

  beforeEach(() => {
    push = { send: jest.fn().mockResolvedValue({ invalidTokens: [] }) };
    prisma = {
      deviceToken: {
        findMany: jest.fn().mockResolvedValue([{ token: "tok-a" }, { token: "tok-b" }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    service = new NotificationsService(
      { send: jest.fn() } as unknown as WhatsAppProvider,
      { send: jest.fn() } as unknown as EmailProvider,
      push as unknown as PushProvider,
      prisma as unknown as PrismaService,
    );
  });

  it("sends one batched push to every device the users have registered", async () => {
    await service.sendPush(["user-1", "user-2"], { title: "Hi", body: "There" });

    expect(prisma.deviceToken.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ["user-1", "user-2"] } },
      select: { token: true },
    });
    expect(push.send).toHaveBeenCalledWith({
      tokens: ["tok-a", "tok-b"],
      title: "Hi",
      body: "There",
      data: undefined,
    });
  });

  it("dedupes user ids so a user with two roles isn't queried twice", async () => {
    await service.sendPush(["user-1", "user-1"], { title: "Hi", body: "There" });
    expect(prisma.deviceToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: { in: ["user-1"] } } }),
    );
  });

  it("skips the provider entirely when nobody has a registered device", async () => {
    prisma.deviceToken.findMany.mockResolvedValue([]);
    await service.sendPush(["user-1"], { title: "Hi", body: "There" });
    expect(push.send).not.toHaveBeenCalled();
  });

  it("deletes tokens the provider reports as permanently unreachable", async () => {
    push.send.mockResolvedValue({ invalidTokens: ["tok-b"] });
    await service.sendPush(["user-1"], { title: "Hi", body: "There" });

    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["tok-b"] } },
    });
  });

  it("swallows provider failures so the triggering operation still succeeds", async () => {
    push.send.mockRejectedValue(new Error("expo is down"));
    await expect(
      service.sendPush(["user-1"], { title: "Hi", body: "There" }),
    ).resolves.toBeUndefined();
  });

  it("does nothing when given no recipients", async () => {
    await service.sendPush([], { title: "Hi", body: "There" });
    expect(prisma.deviceToken.findMany).not.toHaveBeenCalled();
  });
});
