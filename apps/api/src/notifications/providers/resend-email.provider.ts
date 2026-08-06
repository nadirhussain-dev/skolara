import { Logger } from "@nestjs/common";
import type { EmailMessage, EmailProvider } from "../email-provider.interface";

export interface ResendEmailConfig {
  apiKey: string;
  from: string;
}

export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private config: ResendEmailConfig) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.from,
        to: message.to,
        subject: message.subject,
        text: message.body,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Email send failed (${res.status}): ${body}`);
      throw new Error(`Email send failed with status ${res.status}`);
    }
  }
}
