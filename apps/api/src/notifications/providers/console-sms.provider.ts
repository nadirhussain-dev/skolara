import { Logger } from "@nestjs/common";
import type { SmsMessage, SmsProvider } from "../sms-provider.interface";

export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  async send(message: SmsMessage): Promise<void> {
    this.logger.log(`[SMS stub] to ${message.toPhone}: ${message.body}`);
  }
}
