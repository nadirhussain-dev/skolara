import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { EmailProvider } from "./email-provider.interface";
import { EMAIL_PROVIDER } from "./email-provider.interface";
import type { PushProvider } from "./push-provider.interface";
import { PUSH_PROVIDER } from "./push-provider.interface";
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
