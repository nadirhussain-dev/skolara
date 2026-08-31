import { Logger } from "@nestjs/common";
import type { StorageProvider } from "../storage-provider.interface";

export interface SupabaseStorageConfig {
  url: string;
  serviceRoleKey: string;
  bucket: string;
  /**
   * How long the returned signed URL stays valid. Stored on the record (e.g.
   * `PaymentSubmission.screenshotUrl`), so this wants to outlive the record's
   * useful review window — a year by default.
   */
  signedUrlTtlSeconds: number;
}

export class SupabaseStorageProvider implements StorageProvider {
  private readonly logger = new Logger(SupabaseStorageProvider.name);

  constructor(private config: SupabaseStorageConfig) {}

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    const uploadRes = await fetch(
      `${this.config.url}/storage/v1/object/${this.config.bucket}/${key}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.serviceRoleKey}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: new Uint8Array(body),
      },
    );

    if (!uploadRes.ok) {
      const detail = await uploadRes.text().catch(() => uploadRes.statusText);
      this.logger.error(`Supabase Storage upload failed (${uploadRes.status}): ${detail}`);
      throw new Error("File upload failed");
    }

    const signRes = await fetch(
      `${this.config.url}/storage/v1/object/sign/${this.config.bucket}/${key}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: this.config.signedUrlTtlSeconds }),
      },
    );

    if (!signRes.ok) {
      const detail = await signRes.text().catch(() => signRes.statusText);
      this.logger.error(`Supabase Storage sign failed (${signRes.status}): ${detail}`);
      throw new Error("File upload failed");
    }

    const { signedURL } = (await signRes.json()) as { signedURL: string };
    return `${this.config.url}/storage/v1${signedURL}`;
  }
}
