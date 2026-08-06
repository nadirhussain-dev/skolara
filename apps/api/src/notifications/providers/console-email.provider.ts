import { Logger } from "@nestjs/common";
import type { EmailMessage, EmailProvider } from "../email-provider.interface";

export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `[Email stub] to ${message.to} — ${message.subject}\n${message.body}`,
    );
  }
}
