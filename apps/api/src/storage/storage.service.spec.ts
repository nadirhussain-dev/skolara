import { BadRequestException } from "@nestjs/common";
import { MAX_UPLOAD_BYTES } from "@skolara/types";
import { StorageService } from "./storage.service";
import type { StorageProvider } from "./storage-provider.interface";

describe("StorageService", () => {
  let provider: { upload: jest.Mock };
  let service: StorageService;

  const png = (overrides: Partial<{ mimetype: string; size: number; buffer: Buffer }> = {}) => ({
    mimetype: "image/png",
    size: 1024,
    buffer: Buffer.from("fake-png-bytes"),
    ...overrides,
  });

  beforeEach(() => {
    provider = { upload: jest.fn().mockResolvedValue("https://storage.test/signed/abc.png") };
    service = new StorageService(provider as unknown as StorageProvider);
  });

  it("namespaces the key by school and purpose, and returns the provider URL", async () => {
    const result = await service.upload("school-1", "PAYMENT_SCREENSHOT", png());

    expect(result.url).toBe("https://storage.test/signed/abc.png");
    expect(result.contentType).toBe("image/png");
    expect(result.sizeBytes).toBe(1024);
    expect(result.key).toMatch(/^school-1\/PAYMENT_SCREENSHOT\/[0-9a-f]{32}\.png$/);
    expect(provider.upload).toHaveBeenCalledWith(result.key, expect.any(Buffer), "image/png");
  });

  it("gives every upload a distinct unguessable key", async () => {
    const first = await service.upload("school-1", "PAYMENT_SCREENSHOT", png());
    const second = await service.upload("school-1", "PAYMENT_SCREENSHOT", png());
    expect(first.key).not.toEqual(second.key);
  });

  it("rejects a file type that isn't on the allowlist", async () => {
    await expect(
      service.upload("school-1", "PAYMENT_SCREENSHOT", png({ mimetype: "text/html" })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.upload).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit", async () => {
    await expect(
      service.upload("school-1", "PAYMENT_SCREENSHOT", png({ size: MAX_UPLOAD_BYTES + 1 })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.upload).not.toHaveBeenCalled();
  });

  it("rejects an empty upload", async () => {
    await expect(
      service.upload("school-1", "PAYMENT_SCREENSHOT", png({ buffer: Buffer.alloc(0) })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
