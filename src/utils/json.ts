export function isValidJSON(data: string): boolean {
  try {
    JSON.parse(data);
    return true;
  } catch (e) {
    return false;
  }
}
