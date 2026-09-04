import { Injectable } from "@nestjs/common";
// pdfmake's Node entry point, not the package root — the root is the browser
// bundle. Pinned to 0.2.x deliberately: 0.3 is a rewrite whose server path
// expects a URL resolver it doesn't construct itself, so `createPdfKitDocument`
// throws before producing anything.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PdfPrinter = require("pdfmake/src/printer");
import type { TDocumentDefinitions } from "pdfmake/interfaces";

/**
 * The standard-14 PDF fonts, which every PDF reader has built in.
 *
 * Using these rather than embedding a font family is what keeps the API image
 * small: no font files ship, and no headless browser is needed to lay out
 * HTML. The tradeoff is that these fonts cover Latin script only — see the
 * note on non-Latin names in documents.service.ts.
 */
const STANDARD_FONTS = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

@Injectable()
export class PdfService {
  private readonly printer = new PdfPrinter(STANDARD_FONTS);

  /**
   * Renders a pdfmake document definition to a PDF buffer.
   *
   * pdfmake streams, so this collects the chunks rather than returning the
   * stream — every caller stores the result as a whole file, and a partial
   * upload would be worse than a slightly larger buffer.
   */
  render(definition: TDocumentDefinitions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = this.printer.createPdfKitDocument({
        defaultStyle: { font: "Helvetica", fontSize: 10 },
        pageMargins: [40, 48, 40, 48],
        ...definition,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    });
  }
}
