import { useMutation } from "@tanstack/react-query";
import type { UploadPurpose } from "@skolara/types";
import { useApiClient } from "../context";

export type UploadableFile = Blob | { uri: string; name: string; type: string };

/**
 * Uploads a file and resolves to a durable URL. Call this before submitting
 * the record that references the file — never store a device-local `file://`
 * URI, which is unreachable from anyone else's device.
 */
export function useUploadFile() {
  const api = useApiClient();
  return useMutation({
    mutationFn: ({ file, purpose }: { file: UploadableFile; purpose: UploadPurpose }) =>
      api.uploads.upload(file, purpose),
  });
}
