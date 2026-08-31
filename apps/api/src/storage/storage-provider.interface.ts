export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");

export interface StorageProvider {
  /**
   * Persists `body` under `key` and returns a URL the app can hand to a
   * browser or the mobile app to fetch it back. Keys are unguessable, so the
   * URL is the capability — no separate auth round-trip on read.
   */
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
}
