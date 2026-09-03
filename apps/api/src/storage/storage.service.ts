import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import {
  allowedMimeTypesFor,
  MAX_UPLOAD_BYTES,
  type UploadPurpose,
  type UploadedFile,
} from "@skolara/types";
import { STORAGE_PROVIDER, type StorageProvider } from "./storage-provider.interface";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
};

export interface IncomingFile {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private provider: StorageProvider) {}

  async upload(
    schoolId: string,
    purpose: UploadPurpose,
    file: IncomingFile,
  ): Promise<UploadedFile> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("No file received");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `File is larger than the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit`,
      );
    }
    // The allowlist depends on what the file is for: study materials accept
    // Office documents, everything else stays on images and PDF.
    const allowed = allowedMimeTypesFor(purpose);
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type ${file.mimetype} — allowed: ${allowed.join(", ")}`,
      );
    }

    // 32 hex chars of entropy: the key is what makes the returned URL
    // unguessable, so it carries the access control for the stored object.
    const extension = EXTENSION_BY_MIME[file.mimetype];
    const key = `${schoolId}/${purpose}/${randomBytes(16).toString("hex")}.${extension}`;
    const url = await this.provider.upload(key, file.buffer, file.mimetype);

    return { key, url, contentType: file.mimetype, sizeBytes: file.size };
  }
}
