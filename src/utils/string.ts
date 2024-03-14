export function stripQuotes(value: string): string {
  return (value || '').replace(/["']/g, '');
}
