/**
 * Checks that a file's first bytes match the type it claims to be.
 *
 * The declared MIME type comes from the client and costs nothing to forge:
 * without this, an HTML page or a script uploaded as "image/png" is stored
 * and later served as if it were an image. Matching the leading bytes means
 * what is stored is at least the kind of file the allowlist approved.
 *
 * This is a format check, not a virus scan.
 */

const ascii = (text: string) => Buffer.from(text, "latin1");
const startsWith = (buffer: Buffer, bytes: Buffer, offset = 0) =>
  buffer.length >= offset + bytes.length &&
  buffer.subarray(offset, offset + bytes.length).equals(bytes);

const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** Word/Excel/PowerPoint 97–2003: an OLE compound file. */
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
/** docx/xlsx/pptx are ZIP archives. */
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

function isPlainText(buffer: Buffer): boolean {
  // Text has no NUL bytes; every binary format here does, early on.
  const sample = buffer.subarray(0, 8192);
  if (sample.includes(0)) return false;
  // And it must not be markup a browser would run if it were ever served as
  // HTML by mistake.
  const head = sample.toString("latin1").trimStart().toLowerCase();
  return !/^(<!doctype|<html|<script|<svg|<\?xml)/.test(head);
}

const CHECKS: Record<string, (buffer: Buffer) => boolean> = {
  "image/jpeg": (b) => startsWith(b, JPEG),
  "image/png": (b) => startsWith(b, PNG),
  "image/webp": (b) => startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8),
  "image/heic": (b) =>
    startsWith(b, ascii("ftyp"), 4) && HEIC_BRANDS.has(b.subarray(8, 12).toString("latin1")),
  // The PDF spec allows the header anywhere in the first 1024 bytes.
  "application/pdf": (b) => b.subarray(0, 1024).includes(ascii("%PDF-")),
  "application/msword": (b) => startsWith(b, OLE),
  "application/vnd.ms-excel": (b) => startsWith(b, OLE),
  "application/vnd.ms-powerpoint": (b) => startsWith(b, OLE),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b) =>
    startsWith(b, ZIP),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": (b) => startsWith(b, ZIP),
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": (b) =>
    startsWith(b, ZIP),
  "text/plain": isPlainText,
};

/**
 * True when the content is consistent with the declared type. A type with no
 * known signature is rejected rather than waved through, so adding a type to
 * the upload allowlist without adding its check here fails closed.
 */
export function contentMatchesType(buffer: Buffer, mimetype: string): boolean {
  const check = CHECKS[mimetype];
  return check ? check(buffer) : false;
}
