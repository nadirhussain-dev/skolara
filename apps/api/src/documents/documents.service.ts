import { Injectable } from "@nestjs/common";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { UploadedFile } from "@skolara/types";
import { StorageService } from "../storage/storage.service";
import { PdfService } from "./pdf.service";

/**
 * Renders a document and puts it in storage, returning the URL to hand to a
 * parent or teacher.
 *
 * Generated documents go through the same storage path as uploads, so they
 * inherit the unguessable-key treatment: the URL is the capability, and
 * nothing else needs to gate access to a receipt.
 *
 * Known limitation: the standard-14 PDF fonts cover Latin script only, so a
 * name written in Urdu script renders as blanks. Every school in the pilot
 * records names in Latin script, but this needs an embedded font before that
 * stops being true — see pdf.service.ts.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private pdf: PdfService,
    private storage: StorageService,
  ) {}

  async renderAndStore(
    schoolId: string,
    definition: TDocumentDefinitions,
  ): Promise<UploadedFile> {
    const buffer = await this.pdf.render(definition);
    return this.storage.upload(schoolId, "GENERATED_DOCUMENT", {
      mimetype: "application/pdf",
      size: buffer.length,
      buffer,
    });
  }
}
