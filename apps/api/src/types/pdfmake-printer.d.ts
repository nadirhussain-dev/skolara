/**
 * `@types/pdfmake` only declares the package root, which is the browser
 * bundle. The Node entry point lives at `pdfmake/src/printer` and ships no
 * types of its own, so it's declared here rather than casting through `any`
 * at the one call site.
 */
declare module "pdfmake/src/printer" {
  import type {
    BufferOptions,
    TDocumentDefinitions,
    TFontDictionary,
  } from "pdfmake/interfaces";

  class PdfPrinter {
    constructor(fonts: TFontDictionary);
    /**
     * Returns a PDFKit document — a readable stream that must be `end()`ed
     * before it emits anything.
     */
    createPdfKitDocument(
      documentDefinition: TDocumentDefinitions,
      options?: BufferOptions,
    ): NodeJS.ReadableStream & { end(): void };
  }

  export = PdfPrinter;
}
