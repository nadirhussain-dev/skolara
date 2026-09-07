export interface SmsMessage {
  toPhone: string;
  body: string;
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<void>;
}

export const SMS_PROVIDER = Symbol("SMS_PROVIDER");
