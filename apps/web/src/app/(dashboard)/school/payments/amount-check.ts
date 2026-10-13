export type AmountCheck =
  | { kind: "matches" }
  | { kind: "partial"; shortBy: number }
  | { kind: "over"; overBy: number };

/**
 * How the amount a parent says they paid compares with what the invoice
 * still needs. The reviewer has to do this subtraction for every submission;
 * doing it for them is most of what makes the queue fast.
 *
 * Compared in whole paisa so 12500.1 + 0.2 style float noise can't turn an
 * exact payment into a "partial" one.
 */
export function checkAmount(amountClaimed: number, amountDue: number, amountPaid: number): AmountCheck {
  const toPaisa = (value: number) => Math.round(value * 100);
  const balance = Math.max(0, toPaisa(amountDue) - toPaisa(amountPaid));
  const difference = toPaisa(amountClaimed) - balance;

  if (difference === 0) return { kind: "matches" };
  if (difference < 0) return { kind: "partial", shortBy: -difference / 100 };
  return { kind: "over", overBy: difference / 100 };
}

/** The outstanding amount on the invoice, never below zero. */
export function invoiceBalance(amountDue: number, amountPaid: number): number {
  return Math.max(0, Math.round(amountDue * 100) - Math.round(amountPaid * 100)) / 100;
}
