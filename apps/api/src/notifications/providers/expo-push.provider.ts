import { Logger } from "@nestjs/common";
import type {
  PushMessage,
  PushProvider,
  PushSendResult,
} from "../push-provider.interface";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

// Expo rejects requests carrying more than 100 messages.
const MAX_MESSAGES_PER_REQUEST = 100;

interface ExpoTicket {
  status: "ok" | "error";
  details?: { error?: string };
}

export interface ExpoPushConfig {
  /**
   * Only needed when the Expo project has "Enhanced Security for Push
   * Notifications" turned on; unauthenticated sends work otherwise.
   */
  accessToken?: string;
}

export class ExpoPushProvider implements PushProvider {
  private readonly logger = new Logger(ExpoPushProvider.name);

  constructor(private config: ExpoPushConfig = {}) {}

  async send(message: PushMessage): Promise<PushSendResult> {
    const invalidTokens: string[] = [];

    for (let i = 0; i < message.tokens.length; i += MAX_MESSAGES_PER_REQUEST) {
      const batch = message.tokens.slice(i, i + MAX_MESSAGES_PER_REQUEST);
      const tickets = await this.sendBatch(batch, message);

      // Tickets come back positionally aligned with the messages sent.
      tickets.forEach((ticket, index) => {
        if (ticket?.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          invalidTokens.push(batch[index]);
        }
      });
    }

    return { invalidTokens };
  }

  private async sendBatch(
    tokens: string[],
    message: PushMessage,
  ): Promise<ExpoTicket[]> {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.accessToken
          ? { Authorization: `Bearer ${this.config.accessToken}` }
          : {}),
      },
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          title: message.title,
          body: message.body,
          data: message.data,
          sound: "default",
        })),
      ),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      this.logger.error(`Expo push send failed (${res.status}): ${detail}`);
      throw new Error(`Expo push send failed with status ${res.status}`);
    }

    const payload = (await res.json()) as { data?: ExpoTicket[] };
    return payload.data ?? [];
  }
}
