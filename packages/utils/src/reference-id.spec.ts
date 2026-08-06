import { formatPaymentReference } from "./reference-id";

describe("formatPaymentReference", () => {
  it("pads the sequence to 6 digits", () => {
    expect(formatPaymentReference(2026, 482)).toBe("SKL-2026-000482");
  });

  it("doesn't truncate a sequence already 6+ digits", () => {
    expect(formatPaymentReference(2026, 1234567)).toBe("SKL-2026-1234567");
  });

  it("supports a custom prefix", () => {
    expect(formatPaymentReference(2026, 1, "ABC")).toBe("ABC-2026-000001");
  });
});
