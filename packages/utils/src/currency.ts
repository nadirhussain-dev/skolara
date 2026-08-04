export function formatCurrency(
  amount: number,
  currency: string = "PKR",
  locale: string = "en-PK",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
