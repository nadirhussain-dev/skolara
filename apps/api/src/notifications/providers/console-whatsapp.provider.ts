import { Logger } from "@nestjs/common";
import type { WhatsAppMessage, WhatsAppProvider } from "../whatsapp-provider.interface";

export class ConsoleWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger(ConsoleWhatsAppProvider.name);

  async send(message: WhatsAppMessage): Promise<void> {
    this.logger.log(`[WhatsApp stub] to ${message.toPhone}: ${message.body}`);
  }
}
