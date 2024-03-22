export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}
