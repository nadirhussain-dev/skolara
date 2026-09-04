import { Logger } from "@nestjs/common";
import type { SmsMessage, SmsProvider } from "../sms-provider.interface";

export interface TwilioSmsConfig {
  accountSid: string;
  authToken: string;
  /** The Twilio number or alphanumeric sender id messages come from. */
  from: string;
}

/**
 * Twilio's REST API over `fetch`, rather than the `twilio` SDK.
 *
 * One form-encoded POST is the whole integration, and the SDK is ~2MB of
 * dependency for it. The same reasoning the WhatsApp provider follows.
 */
export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);

  constructor(private config: TwilioSmsConfig) {}

  async send(message: SmsMessage): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
    const credentials = Buffer.from(
      `${this.config.accountSid}:${this.config.authToken}`,
    ).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: message.toPhone,
        From: this.config.from,
        Body: message.body,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      // Deliberately does not log the message body: an SMS carries fee
      // amounts and children's names, and this line goes to the platform's
      // logs, not the school's.
      this.logger.error(`SMS send failed (${res.status}): ${body}`);
      throw new Error(`SMS send failed with status ${res.status}`);
    }
  }
}
