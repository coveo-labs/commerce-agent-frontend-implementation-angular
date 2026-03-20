const audCurrencyFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0
});

export function formatAudPrice(value: number): string {
  return audCurrencyFormatter.format(value);
}
