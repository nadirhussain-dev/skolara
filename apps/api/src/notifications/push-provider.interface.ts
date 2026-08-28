export interface PushMessage {
  /** Expo push tokens for one logical notification, batched in a single send. */
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushSendResult {
  /**
   * Tokens the provider reported as permanently invalid (app uninstalled,
   * token rotated). The caller deletes these rather than retrying.
   */
  invalidTokens: string[];
}

export interface PushProvider {
  send(message: PushMessage): Promise<PushSendResult>;
}

export const PUSH_PROVIDER = Symbol("PUSH_PROVIDER");
