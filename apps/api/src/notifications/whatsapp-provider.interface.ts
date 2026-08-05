export interface WhatsAppMessage {
  toPhone: string;
  body: string;
}

export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<void>;
}

export const WHATSAPP_PROVIDER = Symbol("WHATSAPP_PROVIDER");
