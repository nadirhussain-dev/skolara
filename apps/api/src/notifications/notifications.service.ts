import { Inject, Injectable, Logger } from "@nestjs/common";
import type { PhoneChannel } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { EmailProvider } from "./email-provider.interface";
import { EMAIL_PROVIDER } from "./email-provider.interface";
import type { PushProvider } from "./push-provider.interface";
import { PUSH_PROVIDER } from "./push-provider.interface";
import type { SmsProvider } from "./sms-provider.interface";
import { SMS_PROVIDER } from "./sms-provider.interface";
import type { WhatsAppProvider } from "./whatsapp-provider.interface";
import { WHATSAPP_PROVIDER } from "./whatsapp-provider.interface";

export interface PushPayload {
  title: string;
  body: string;
  /** Deep-link target and any ids the app needs to route the tap. */
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(WHATSAPP_PROVIDER) private whatsapp: WhatsAppProvider,
    @Inject(EMAIL_PROVIDER) private email: EmailProvider,
    @Inject(PUSH_PROVIDER) private push: PushProvider,
    @Inject(SMS_PROVIDER) private sms: SmsProvider,
    private prisma: PrismaService,
  ) {}

  async sendWhatsApp(toPhone: string | null | undefined, body: string) {
    if (!toPhone) return;
    try {
      await this.whatsapp.send({ toPhone, body });
    } catch (error) {
      // A failed alert must never fail the business operation that triggered it.
      this.logger.warn(`WhatsApp alert failed for ${toPhone}: ${error}`);
    }
  }

  async sendSms(toPhone: string | null | undefined, body: string) {
    if (!toPhone) return;
    try {
      await this.sms.send({ toPhone, body });
    } catch (error) {
      // Same rule as every other channel: a failed alert must never fail the
      // business operation that triggered it.
      this.logger.warn(`SMS failed for ${toPhone}: ${error}`);
    }
  }

  /**
   * Sends one alert to a phone number on whichever channels the school has
   * chosen.
   *
   * Every caller that used to reach for `sendWhatsApp` directly should use
   * this instead: which channel a school's parents actually read is the
   * school's business, and hard-coding WhatsApp at each call site means a
   * school that switches has to have every one of them found and changed.
   *
   * Falling back from WhatsApp to SMS on failure is deliberately *not* what
   * this does. The Meta Cloud API accepts a message for a number with no
   * WhatsApp account and reports the failure later on a delivery webhook, so
   * a synchronous fallback would miss the case it exists for while
   * double-charging for the ones it caught. A school that needs the certainty
   * picks BOTH and pays for it knowingly.
   */
  async sendPhoneAlert(
    schoolId: string | null | undefined,
    toPhone: string | null | undefined,
    body: string,
  ) {
    if (!toPhone) return;

    const channel = await this.phoneChannel(schoolId);
    await Promise.all([
      channel === "WHATSAPP" || channel === "BOTH"
        ? this.sendWhatsApp(toPhone, body)
        : undefined,
      channel === "SMS" || channel === "BOTH" ? this.sendSms(toPhone, body) : undefined,
    ]);
  }

  /**
   * Sends one alert to many numbers, reading the school's choice once rather
   * than once per recipient — a whole-school notice is several hundred
   * recipients and one preference.
   */
  async sendPhoneAlerts(
    schoolId: string | null | undefined,
    recipients: readonly (string | null)[],
    body: string,
  ) {
    const numbers = recipients.filter((phone): phone is string => Boolean(phone));
    if (numbers.length === 0) return;

    const channel = await this.phoneChannel(schoolId);
    const sends: Promise<void>[] = [];
    for (const toPhone of numbers) {
      if (channel === "WHATSAPP" || channel === "BOTH") {
        sends.push(this.sendWhatsApp(toPhone, body));
      }
      if (channel === "SMS" || channel === "BOTH") {
        sends.push(this.sendSms(toPhone, body));
      }
    }
    await Promise.all(sends);
  }

  /**
   * Defaults to WhatsApp when the school can't be read: the alternative is
   * either sending nothing, which loses an alert a parent was waiting for, or
   * sending on every channel, which bills the school for a database hiccup.
   */
  private async phoneChannel(schoolId: string | null | undefined): Promise<PhoneChannel> {
    if (!schoolId) return "WHATSAPP";
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { phoneChannel: true },
    });
    return school?.phoneChannel ?? "WHATSAPP";
  }

  async sendEmail(to: string | null | undefined, subject: string, body: string) {
    if (!to) return;
    try {
      await this.email.send({ to, subject, body });
    } catch (error) {
      // Same rule as WhatsApp: a failed email must never fail the caller's
      // business operation (e.g. an admitted student shouldn't roll back
      // because a welcome email bounced).
      this.logger.warn(`Email failed for ${to}: ${error}`);
    }
  }

  /**
   * Fans a notification out to every device the given users have registered.
   * Silently no-ops when none of them have the app installed.
   */
  async sendPush(userIds: string[], payload: PushPayload) {
    const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
    if (uniqueUserIds.length === 0) return;

    const devices = await this.prisma.deviceToken.findMany({
      where: { userId: { in: uniqueUserIds } },
      select: { token: true },
    });
    if (devices.length === 0) return;

    try {
      const { invalidTokens } = await this.push.send({
        tokens: devices.map((device) => device.token),
        title: payload.title,
        body: payload.body,
        data: payload.data,
      });

      // The app was uninstalled or the OS rotated the token — the row is dead
      // weight and will never deliver again, so drop it.
      if (invalidTokens.length > 0) {
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: invalidTokens } },
        });
      }
    } catch (error) {
      // Same rule as WhatsApp and email: a failed alert must never fail the
      // business operation that triggered it.
      this.logger.warn(`Push notification failed: ${error}`);
    }
  }
}
