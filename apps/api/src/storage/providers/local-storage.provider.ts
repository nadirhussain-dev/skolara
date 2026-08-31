import { Logger } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StorageProvider } from "../storage-provider.interface";

export interface LocalStorageConfig {
  directory: string;
  /** Base URL this API is reachable at, used to build the returned file URL. */
  publicBaseUrl: string;
}

/**
 * Development fallback for when Supabase Storage isn't configured. Files land
 * on local disk and are served back by `GET /uploads/files/:name` — fine for a
 * single dev machine, not for a real deployment (container filesystems are
 * ephemeral and don't survive a redeploy).
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);

  constructor(private config: LocalStorageConfig) {
    this.logger.warn(
      "SUPABASE_STORAGE_BUCKET is not configured — uploads are being written to local disk. " +
        "Set the Supabase storage vars before deploying.",
    );
  }

  async upload(key: string, body: Buffer, _contentType: string): Promise<string> {
    // Keys are namespaced with `/`; flatten them so everything lives in one
    // directory and the serving route can stay a single non-wildcard segment.
    const name = key.replace(/\//g, "__");
    await mkdir(this.config.directory, { recursive: true });
    await writeFile(join(this.config.directory, name), body);
    return `${this.config.publicBaseUrl}/uploads/files/${name}`;
  }
}
