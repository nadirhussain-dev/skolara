import { Inject, Injectable, Logger } from "@nestjs/common";
import type { EmailProvider } from "./email-provider.interface";
import { EMAIL_PROVIDER } from "./email-provider.interface";
import type { WhatsAppProvider } from "./whatsapp-provider.interface";
import { WHATSAPP_PROVIDER } from "./whatsapp-provider.interface";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(WHATSAPP_PROVIDER) private whatsapp: WhatsAppProvider,
    @Inject(EMAIL_PROVIDER) private email: EmailProvider,
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
}
