import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EMAIL_PROVIDER } from "./email-provider.interface";
import { NotificationsService } from "./notifications.service";
import { ConsoleEmailProvider } from "./providers/console-email.provider";
import { ConsoleWhatsAppProvider } from "./providers/console-whatsapp.provider";
import { MetaCloudWhatsAppProvider } from "./providers/meta-cloud-whatsapp.provider";
import { ResendEmailProvider } from "./providers/resend-email.provider";
import { WHATSAPP_PROVIDER } from "./whatsapp-provider.interface";

@Global()
@Module({
  providers: [
    {
      provide: WHATSAPP_PROVIDER,
      useFactory: (config: ConfigService) => {
        const accessToken = config.get<string>("WHATSAPP_ACCESS_TOKEN");
        const phoneNumberId = config.get<string>("WHATSAPP_PHONE_NUMBER_ID");
        if (accessToken && phoneNumberId) {
          return new MetaCloudWhatsAppProvider({ accessToken, phoneNumberId });
        }
        return new ConsoleWhatsAppProvider();
      },
      inject: [ConfigService],
    },
    {
      provide: EMAIL_PROVIDER,
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>("RESEND_API_KEY");
        const from = config.get<string>("EMAIL_FROM");
        if (apiKey && from) {
          return new ResendEmailProvider({ apiKey, from });
        }
        return new ConsoleEmailProvider();
      },
      inject: [ConfigService],
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
