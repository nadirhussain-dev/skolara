import { Inject, Injectable, Logger } from "@nestjs/common";
import type { WhatsAppProvider } from "./whatsapp-provider.interface";
import { WHATSAPP_PROVIDER } from "./whatsapp-provider.interface";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(WHATSAPP_PROVIDER) private whatsapp: WhatsAppProvider,
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
}
