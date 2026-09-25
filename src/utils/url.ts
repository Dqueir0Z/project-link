const UNSAFE_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:'];

export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Block unsafe protocols
  for (const proto of UNSAFE_PROTOCOLS) {
    if (lower.startsWith(proto)) return null;
  }

  // If no protocol, prepend https://
  if (!/^https?:\/\//i.test(trimmed)) {
    // Must look like a domain (something.tld)
    if (!/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return null;
    return `https://${trimmed}`;
  }

  // Validate it's a proper http/https URL
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

export function isValidUrl(input: string): boolean {
  return normalizeUrl(input) !== null;
}

export function getPublicOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://linkforge.app';
}

export function buildShortUrl(shortCode: string): string {
  return `${getPublicOrigin()}/${shortCode}`;
}

export function buildPageUrl(slug: string): string {
  return `${getPublicOrigin()}/${slug}`;
}
