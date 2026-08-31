import { Logger } from "@nestjs/common";
import type {
  PushMessage,
  PushProvider,
  PushSendResult,
} from "../push-provider.interface";

export class ConsolePushProvider implements PushProvider {
  private readonly logger = new Logger(ConsolePushProvider.name);

  async send(message: PushMessage): Promise<PushSendResult> {
    this.logger.log(
      `[Push stub] to ${message.tokens.length} device(s): ${message.title} — ${message.body}`,
    );
    return { invalidTokens: [] };
  }
}
