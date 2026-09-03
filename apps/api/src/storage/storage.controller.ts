import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { MAX_UPLOAD_BYTES, uploadPurposeSchema } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { StorageService } from "./storage.service";
import { localStorageDirectory } from "./storage.module";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

// Flattened local keys only ever contain hex, `__`, and the extension. Anything
// else is a traversal attempt, not a file we wrote.
const SAFE_LOCAL_NAME = /^[A-Za-z0-9_.-]+$/;

@Controller("uploads")
export class StorageController {
  constructor(
    private storageService: StorageService,
    private config: ConfigService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    // Non-file multipart text fields land on the body alongside the binary part.
    @Body("purpose") purpose: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    if (!file) throw new BadRequestException("No file received");

    const parsed = uploadPurposeSchema.safeParse(purpose);
    if (!parsed.success) {
      throw new BadRequestException(
        `purpose must be one of: ${uploadPurposeSchema.options.join(", ")}`,
      );
    }

    return this.storageService.upload(user.schoolId, parsed.data, file);
  }

  /**
   * Serves files written by the local development storage provider. Not used
   * against Supabase Storage — there the returned signed URL points straight
   * at Supabase and never comes back through the API.
   */
  @Get("files/:name")
  async serveLocalFile(@Param("name") name: string, @Res() res: Response) {
    if (!SAFE_LOCAL_NAME.test(name) || name.includes("..")) {
      throw new NotFoundException("File not found");
    }

    const path = join(localStorageDirectory(this.config), name);
    const isFile = await stat(path).then(
      (stats) => stats.isFile(),
      () => false,
    );
    if (!isFile) throw new NotFoundException("File not found");

    const extension = name.split(".").pop() ?? "";
    res.setHeader("Content-Type", MIME_BY_EXTENSION[extension] ?? "application/octet-stream");
    createReadStream(path).pipe(res);
  }
}
