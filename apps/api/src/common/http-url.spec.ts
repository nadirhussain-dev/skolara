import { httpUrlSchema, submitAssignmentSchema, submitPaymentSchema, updateBrandingSchema } from "@skolara/types";

const INVOICE = "11111111-1111-4111-8111-111111111111";
const BAD = [
  "javascript:alert(document.cookie)",
  "JAVASCRIPT:alert(1)",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "ftp://example.com/x",
  "//example.com/x",
  "not a url",
];

describe("user-supplied URLs", () => {
  it("accepts http and https", () => {
    expect(httpUrlSchema.safeParse("https://files.example.com/receipt.png").success).toBe(true);
    expect(httpUrlSchema.safeParse("http://localhost:4000/files/x").success).toBe(true);
  });

  it.each(BAD)("refuses %p everywhere a URL is submitted", (url) => {
    expect(httpUrlSchema.safeParse(url).success).toBe(false);
    expect(submitPaymentSchema.safeParse({ invoiceId: INVOICE, amountClaimed: 100, screenshotUrl: url }).success).toBe(false);
    expect(submitAssignmentSchema.safeParse({ fileUrl: url }).success).toBe(false);
    expect(updateBrandingSchema.safeParse({ logoUrl: url }).success).toBe(false);
  });

  it("refuses an address longer than 2000 characters", () => {
    expect(httpUrlSchema.safeParse(`https://example.com/${"a".repeat(2000)}`).success).toBe(false);
  });
});
