import { NotificationsService } from "./notifications.service";
import type { EmailProvider } from "./email-provider.interface";
import type { PushProvider } from "./push-provider.interface";
import type { SmsProvider } from "./sms-provider.interface";
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
      { send: jest.fn() } as unknown as SmsProvider,
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


describe("NotificationsService phone channel", () => {
  const SCHOOL = "school-1";
  const PHONE = "+923001234567";

  let whatsapp: { send: jest.Mock };
  let sms: { send: jest.Mock };
  let prisma: { school: { findUnique: jest.Mock } };
  let service: NotificationsService;

  const channel = (value: string | null) =>
    prisma.school.findUnique.mockResolvedValue(value ? { phoneChannel: value } : null);

  beforeEach(() => {
    whatsapp = { send: jest.fn() };
    sms = { send: jest.fn() };
    prisma = { school: { findUnique: jest.fn().mockResolvedValue({ phoneChannel: "WHATSAPP" }) } };
    service = new NotificationsService(
      whatsapp as unknown as WhatsAppProvider,
      { send: jest.fn() } as unknown as EmailProvider,
      { send: jest.fn() } as unknown as PushProvider,
      sms as unknown as SmsProvider,
      prisma as unknown as PrismaService,
    );
  });

  describe("sendSms", () => {
    it("sends to the number given", async () => {
      await service.sendSms(PHONE, "Fees due Friday");

      expect(sms.send).toHaveBeenCalledWith({ toPhone: PHONE, body: "Fees due Friday" });
    });

    it.each([null, undefined, ""])("sends nothing when the number is %p", async (phone) => {
      await service.sendSms(phone, "Fees due Friday");

      expect(sms.send).not.toHaveBeenCalled();
    });

    it("swallows a provider failure rather than failing the caller's operation", async () => {
      sms.send.mockRejectedValue(new Error("twilio down"));

      await expect(service.sendSms(PHONE, "Fees due Friday")).resolves.toBeUndefined();
    });
  });

  describe("sendPhoneAlert", () => {
    it("uses WhatsApp alone for a school that hasn't switched", async () => {
      await service.sendPhoneAlert(SCHOOL, PHONE, "Ali was marked absent");

      expect(whatsapp.send).toHaveBeenCalledTimes(1);
      expect(sms.send).not.toHaveBeenCalled();
    });

    it("uses SMS alone for a school that has", async () => {
      channel("SMS");

      await service.sendPhoneAlert(SCHOOL, PHONE, "Ali was marked absent");

      expect(sms.send).toHaveBeenCalledTimes(1);
      expect(whatsapp.send).not.toHaveBeenCalled();
    });

    it("uses both only when the school asked for both", async () => {
      channel("BOTH");

      await service.sendPhoneAlert(SCHOOL, PHONE, "Ali was marked absent");

      expect(whatsapp.send).toHaveBeenCalledTimes(1);
      expect(sms.send).toHaveBeenCalledTimes(1);
    });

    it("falls back to WhatsApp rather than billing for SMS when the school can't be read", async () => {
      channel(null);

      await service.sendPhoneAlert(SCHOOL, PHONE, "Ali was marked absent");

      expect(whatsapp.send).toHaveBeenCalledTimes(1);
      expect(sms.send).not.toHaveBeenCalled();
    });

    it("does not read the school at all when there is no number to send to", async () => {
      await service.sendPhoneAlert(SCHOOL, null, "Ali was marked absent");

      expect(prisma.school.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("sendPhoneAlerts", () => {
    it("reads the school's choice once for a whole-school notice, not once per parent", async () => {
      await service.sendPhoneAlerts(SCHOOL, ["+9230011", "+9230022", "+9230033"], "New notice");

      expect(prisma.school.findUnique).toHaveBeenCalledTimes(1);
      expect(whatsapp.send).toHaveBeenCalledTimes(3);
    });

    it("skips recipients with no number on file", async () => {
      await service.sendPhoneAlerts(SCHOOL, ["+9230011", null, "+9230033"], "New notice");

      expect(whatsapp.send).toHaveBeenCalledTimes(2);
    });

    it("sends nothing, and reads nothing, when no recipient has a number", async () => {
      await service.sendPhoneAlerts(SCHOOL, [null, null], "New notice");

      expect(prisma.school.findUnique).not.toHaveBeenCalled();
      expect(whatsapp.send).not.toHaveBeenCalled();
    });

    it("sends on both channels to every recipient when the school asked for both", async () => {
      channel("BOTH");

      await service.sendPhoneAlerts(SCHOOL, ["+9230011", "+9230022"], "New notice");

      expect(whatsapp.send).toHaveBeenCalledTimes(2);
      expect(sms.send).toHaveBeenCalledTimes(2);
    });
  });
});
