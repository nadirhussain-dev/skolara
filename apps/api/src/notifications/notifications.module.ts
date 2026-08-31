import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EMAIL_PROVIDER } from "./email-provider.interface";
import { NotificationsService } from "./notifications.service";
import { ConsoleEmailProvider } from "./providers/console-email.provider";
import { ConsolePushProvider } from "./providers/console-push.provider";
import { ConsoleWhatsAppProvider } from "./providers/console-whatsapp.provider";
import { ExpoPushProvider } from "./providers/expo-push.provider";
import { MetaCloudWhatsAppProvider } from "./providers/meta-cloud-whatsapp.provider";
import { ResendEmailProvider } from "./providers/resend-email.provider";
import { PUSH_PROVIDER } from "./push-provider.interface";
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
    {
      provide: PUSH_PROVIDER,
      useFactory: (config: ConfigService) => {
        // Expo's push service needs no credentials for a standard project, so
        // this is opt-out rather than opt-in: set EXPO_PUSH_ENABLED=false to
        // fall back to console logging (e.g. in tests or local dev).
        if (config.get<string>("EXPO_PUSH_ENABLED") === "false") {
          return new ConsolePushProvider();
        }
        return new ExpoPushProvider({
          accessToken: config.get<string>("EXPO_ACCESS_TOKEN"),
        });
      },
      inject: [ConfigService],
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
