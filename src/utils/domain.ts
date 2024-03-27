export const VALID_DOMAIN_REGEX =
  /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/;

export function isValidDomain(domain: string): boolean {
  return VALID_DOMAIN_REGEX.test(domain);
}
