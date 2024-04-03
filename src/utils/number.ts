export const formatter = Intl.NumberFormat('en-US', {
  useGrouping: true,
});

export function formatCommaNumber(number: number): string {
  return formatter.format(number);
}

export function getPercentage(portion: number, total: number): string {
  if (total <= 0 || portion <= 0) {
    return '0';
  }

  const percentage = (portion / total) * 100;
  return Math.min(percentage, 100).toFixed(2);
}
