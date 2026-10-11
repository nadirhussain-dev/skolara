import { checkAmount, invoiceBalance } from "./amount-check";

describe("checkAmount", () => {
  it("matches when the claim equals the outstanding balance", () => {
    expect(checkAmount(12_500, 12_500, 0)).toEqual({ kind: "matches" });
  });

  it("matches against what is left, not the original invoice, after a part payment", () => {
    expect(checkAmount(2_500, 12_500, 10_000)).toEqual({ kind: "matches" });
  });

  it("flags a part payment and says how much is missing", () => {
    expect(checkAmount(10_000, 12_500, 0)).toEqual({ kind: "partial", shortBy: 2_500 });
  });

  it("flags a claim above the balance and says by how much", () => {
    expect(checkAmount(13_000, 12_500, 0)).toEqual({ kind: "over", overBy: 500 });
  });

  it("treats any claim against an already-settled invoice as over", () => {
    expect(checkAmount(12_500, 12_500, 12_500)).toEqual({ kind: "over", overBy: 12_500 });
  });

  it("is not fooled by floating-point noise", () => {
    expect(checkAmount(0.3, 0.1 + 0.2, 0)).toEqual({ kind: "matches" });
    expect(checkAmount(12_500.1, 12_500.1, 0)).toEqual({ kind: "matches" });
  });

  it("notices a one-paisa difference", () => {
    expect(checkAmount(12_499.99, 12_500, 0)).toEqual({ kind: "partial", shortBy: 0.01 });
  });
});

describe("invoiceBalance", () => {
  it("is due minus paid", () => {
    expect(invoiceBalance(12_500, 10_000)).toBe(2_500);
  });

  it("never goes negative on an overpaid invoice", () => {
    expect(invoiceBalance(10_000, 12_000)).toBe(0);
  });
});
