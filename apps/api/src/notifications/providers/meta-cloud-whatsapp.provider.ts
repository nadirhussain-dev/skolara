import { Logger } from "@nestjs/common";
import type { WhatsAppMessage, WhatsAppProvider } from "../whatsapp-provider.interface";

export interface MetaCloudWhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion?: string;
}

export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger(MetaCloudWhatsAppProvider.name);

  constructor(private config: MetaCloudWhatsAppConfig) {}

  async send(message: WhatsAppMessage): Promise<void> {
    const version = this.config.apiVersion ?? "v21.0";
    const url = `https://graph.facebook.com/${version}/${this.config.phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: message.toPhone,
        type: "text",
        text: { body: message.body },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`WhatsApp send failed (${res.status}): ${body}`);
      throw new Error(`WhatsApp send failed with status ${res.status}`);
    }
  }
}
