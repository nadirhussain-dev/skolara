import type { ImagePickerAsset } from "expo-image-picker";
import type { UploadableFile } from "@skolara/api-client";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
};

/**
 * Turns an expo-image-picker asset into the `{ uri, name, type }` descriptor
 * React Native's FormData needs. The picker doesn't always populate
 * `fileName`/`mimeType` (notably on Android), so both are derived from the URI
 * as a fallback — an unset content type would be rejected by the API.
 */
export function assetToUploadable(asset: ImagePickerAsset): UploadableFile {
  const name = asset.fileName ?? asset.uri.split("/").pop() ?? "upload.jpg";
  const extension = name.split(".").pop()?.toLowerCase() ?? "jpg";
  return {
    uri: asset.uri,
    name,
    type: asset.mimeType ?? MIME_BY_EXTENSION[extension] ?? "image/jpeg",
  };
}
