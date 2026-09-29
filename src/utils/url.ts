const UNSAFE_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:'];

/**
 * Canonical URL validation pipeline for destination links.
 * Only http and https are accepted.
 * Rejects unsafe protocols, userinfo URLs, and invalid hostnames.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Block unsafe protocols immediately
  for (const proto of UNSAFE_PROTOCOLS) {
    if (lower.startsWith(proto)) return null;
  }

  // If no protocol, prepend https://
  let candidate: string;
  if (!/^https?:\/\//i.test(trimmed)) {
    // Must look like a domain (something.tld)
    if (!/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return null;
    candidate = `https://${trimmed}`;
  } else {
    candidate = trimmed;
  }

  // Always parse using URL
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // Reject userinfo (e.g., google.com@evil-example.com)
    if (url.username || url.password) return null;
    // Require a valid hostname with at least one dot
    if (!url.hostname || !url.hostname.includes('.')) return null;
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

/**
 * Returns the origin path prefix for display in forms (e.g., "linkforge.app/" or "localhost:5173/")
 */
export function getOriginPrefix(): string {
  const origin = getPublicOrigin();
  // Remove protocol for display
  return origin.replace(/^https?:\/\//, '') + '/';
}
