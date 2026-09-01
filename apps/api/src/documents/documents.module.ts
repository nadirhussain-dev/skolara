import { Global, Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { PdfService } from "./pdf.service";

// Global: report cards, receipts and certificates all live in their own
// modules but render through this one.
@Global()
@Module({
  providers: [PdfService, DocumentsService],
  exports: [PdfService, DocumentsService],
})
export class DocumentsModule {}
