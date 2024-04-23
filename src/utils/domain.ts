export const VALID_DOMAIN_REGEX =
  /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/;

export function isValidDomain(domain: string): boolean {
  return VALID_DOMAIN_REGEX.test(domain);
}

export const DEFAULT_DISALLOWED_SUBDOMAINS = ['www'];

export function isSubdomain(
  subdomain: string,
  domain: string,
  disallowedSubdomains: string[] = [], // e.g. ['www', 'mail']
): boolean {
  const sanitizedSubdomain = subdomain.trim().toLowerCase();
  const sanitizedDomain = domain.trim().toLowerCase();

  if (!isValidDomain(sanitizedSubdomain) || !isValidDomain(sanitizedDomain)) {
    return false;
  }

  if (sanitizedSubdomain === sanitizedDomain) {
    return false;
  }

  const fullDisallowedSubdomains = disallowedSubdomains.map((sub) => {
    return `${sub.trim().toLowerCase()}.${sanitizedDomain}`;
  });
  if (fullDisallowedSubdomains.includes(sanitizedSubdomain)) {
    return false;
  }

  return sanitizedSubdomain.endsWith(`.${sanitizedDomain}`);
}
