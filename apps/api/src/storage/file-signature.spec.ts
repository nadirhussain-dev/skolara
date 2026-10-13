import { ALLOWED_UPLOAD_MIME_TYPES, STUDY_MATERIAL_EXTRA_MIME_TYPES } from "@skolara/types";
import { contentMatchesType } from "./file-signature";

const bytes = (...values: number[]) => Buffer.from(values);
const pad = (head: Buffer, length = 64) => Buffer.concat([head, Buffer.alloc(length, 1)]);

const PNG = pad(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a));
const JPEG = pad(bytes(0xff, 0xd8, 0xff, 0xe0));
const PDF = pad(Buffer.from("%PDF-1.7\n"));
const WEBP = pad(Buffer.concat([Buffer.from("RIFF"), bytes(1, 2, 3, 4), Buffer.from("WEBP")]));
const HEIC = pad(Buffer.concat([bytes(0, 0, 0, 0x18), Buffer.from("ftypheic")]));
const ZIP = pad(bytes(0x50, 0x4b, 0x03, 0x04));
const OLE = pad(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1));
const HTML = Buffer.from("<!DOCTYPE html><script>alert(document.cookie)</script>");

describe("contentMatchesType", () => {
  it("accepts each format under its own type", () => {
    expect(contentMatchesType(PNG, "image/png")).toBe(true);
    expect(contentMatchesType(JPEG, "image/jpeg")).toBe(true);
    expect(contentMatchesType(PDF, "application/pdf")).toBe(true);
    expect(contentMatchesType(WEBP, "image/webp")).toBe(true);
    expect(contentMatchesType(HEIC, "image/heic")).toBe(true);
    expect(
      contentMatchesType(
        ZIP,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true);
    expect(contentMatchesType(OLE, "application/msword")).toBe(true);
    expect(contentMatchesType(Buffer.from("Homework: read chapter 4.\n"), "text/plain")).toBe(true);
  });

  it("rejects an HTML page uploaded as an image", () => {
    expect(contentMatchesType(HTML, "image/png")).toBe(false);
    expect(contentMatchesType(HTML, "image/jpeg")).toBe(false);
  });

  it("rejects an HTML page or script uploaded as a PDF or as plain text", () => {
    expect(contentMatchesType(HTML, "application/pdf")).toBe(false);
    expect(contentMatchesType(HTML, "text/plain")).toBe(false);
    expect(contentMatchesType(Buffer.from("  <svg onload=alert(1)>"), "text/plain")).toBe(false);
  });

  it("rejects one real format declared as another", () => {
    expect(contentMatchesType(PNG, "image/jpeg")).toBe(false);
    expect(contentMatchesType(JPEG, "application/pdf")).toBe(false);
    expect(contentMatchesType(ZIP, "application/msword")).toBe(false);
  });

  it("rejects a RIFF file that is not WebP, such as a WAV", () => {
    const wav = pad(Buffer.concat([Buffer.from("RIFF"), bytes(1, 2, 3, 4), Buffer.from("WAVE")]));
    expect(contentMatchesType(wav, "image/webp")).toBe(false);
  });

  it("rejects an executable renamed to text", () => {
    const exe = pad(Buffer.concat([Buffer.from("MZ"), bytes(0x90, 0x00, 0x03, 0x00)]));
    expect(contentMatchesType(exe, "text/plain")).toBe(false);
  });

  it("rejects a file too short to carry its signature", () => {
    expect(contentMatchesType(bytes(0x89, 0x50), "image/png")).toBe(false);
    expect(contentMatchesType(Buffer.alloc(0), "image/jpeg")).toBe(false);
  });

  it("fails closed for a type it has no signature for", () => {
    expect(contentMatchesType(PNG, "image/svg+xml")).toBe(false);
    expect(contentMatchesType(PNG, "application/octet-stream")).toBe(false);
  });

  it("has a signature for every type the upload allowlists accept", () => {
    // If someone widens an allowlist without teaching this file the format,
    // that type would be rejected for every upload — catch it here instead.
    const samples: Record<string, Buffer> = {
      "image/png": PNG,
      "image/jpeg": JPEG,
      "image/webp": WEBP,
      "image/heic": HEIC,
      "application/pdf": PDF,
      "application/msword": OLE,
      "application/vnd.ms-excel": OLE,
      "application/vnd.ms-powerpoint": OLE,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ZIP,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ZIP,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": ZIP,
      "text/plain": Buffer.from("plain text"),
    };
    for (const type of [...ALLOWED_UPLOAD_MIME_TYPES, ...STUDY_MATERIAL_EXTRA_MIME_TYPES]) {
      expect(samples[type]).toBeDefined();
      expect(contentMatchesType(samples[type] as Buffer, type)).toBe(true);
    }
  });
});
