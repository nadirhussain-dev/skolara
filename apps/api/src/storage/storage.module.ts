import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { join } from "node:path";
import { LocalStorageProvider } from "./providers/local-storage.provider";
import { SupabaseStorageProvider } from "./providers/supabase-storage.provider";
import { STORAGE_PROVIDER } from "./storage-provider.interface";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365;

export function localStorageDirectory(config: ConfigService): string {
  return config.get<string>("STORAGE_LOCAL_DIR") ?? join(process.cwd(), ".uploads");
}

@Global()
@Module({
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("SUPABASE_URL");
        const serviceRoleKey = config.get<string>("SUPABASE_SERVICE_ROLE_KEY");
        const bucket = config.get<string>("SUPABASE_STORAGE_BUCKET");

        if (url && serviceRoleKey && bucket) {
          return new SupabaseStorageProvider({
            url: url.replace(/\/$/, ""),
            serviceRoleKey,
            bucket,
            signedUrlTtlSeconds: Number(
              config.get<string>("STORAGE_SIGNED_URL_TTL_SECONDS") ??
                DEFAULT_SIGNED_URL_TTL_SECONDS,
            ),
          });
        }

        const port = config.get<number>("PORT", 4000);
        return new LocalStorageProvider({
          directory: localStorageDirectory(config),
          publicBaseUrl: (
            config.get<string>("PUBLIC_API_URL") ?? `http://localhost:${port}`
          ).replace(/\/$/, ""),
        });
      },
      inject: [ConfigService],
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
