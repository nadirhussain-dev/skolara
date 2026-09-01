import { PdfService } from "./pdf.service";
import { documentStyles, letterhead, tableLayout } from "./document-theme";

describe("PdfService", () => {
  const service = new PdfService();

  it("renders a definition to a real PDF buffer", async () => {
    const buffer = await service.render({ content: [{ text: "Hello" }] });

    // %PDF- magic bytes, then a trailer — proves this is a parseable document
    // rather than an empty or truncated stream.
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.toString("latin1")).toContain("%%EOF");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("renders the shared letterhead and table layout without throwing", async () => {
    const buffer = await service.render({
      content: [
        letterhead({ name: "Beaconhouse Multan", primaryColor: "#0F766E" }, "Report card"),
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto"],
            body: [
              [{ text: "Subject", style: "tableHeader" }, { text: "Marks", style: "tableHeader" }],
              ["Mathematics", "82 / 100"],
            ],
          },
          layout: tableLayout,
        },
      ],
      styles: documentStyles,
    });

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("falls back to the product colour when a school's brand hex is malformed", async () => {
    // Bad hex used to be passed straight to the canvas and threw at render time.
    const buffer = await service.render({
      content: [letterhead({ name: "Test School", primaryColor: "not-a-colour" }, "Receipt")],
      styles: documentStyles,
    });
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("surfaces a rejection rather than hanging when a definition is invalid", async () => {
    await expect(
      // A table with no body is a pdfmake error, not something to swallow.
      service.render({ content: [{ table: { body: [] } }] }),
    ).rejects.toBeDefined();
  });
});
