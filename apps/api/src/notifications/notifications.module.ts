import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationsService } from "./notifications.service";
import { ConsoleWhatsAppProvider } from "./providers/console-whatsapp.provider";
import { MetaCloudWhatsAppProvider } from "./providers/meta-cloud-whatsapp.provider";
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
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
