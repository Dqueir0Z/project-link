const UNSAFE_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:'];

/**
 * Validate and normalize URLs for LinkForge Page links.
 * Allows http, https, mailto, and tel protocols.
 * Rejects unsafe protocols and URLs with userinfo for HTTP/HTTPS.
 */
export function normalizePageLinkUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Block unsafe protocols immediately
  for (const proto of UNSAFE_PROTOCOLS) {
    if (lower.startsWith(proto)) return null;
  }

  // mailto: and tel: — allow as-is with basic validation
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'mailto:' && url.protocol !== 'tel:') return null;
      return url.href;
    } catch {
      // URL may not parse mailto/tel in all environments, accept with basic check
      if (trimmed.length > 7) return trimmed;
      return null;
    }
  }

  // For HTTP/HTTPS: no protocol → prepend https://
  let candidate: string;
  if (!/^https?:\/\//i.test(trimmed)) {
    // Must look like a domain
    if (!/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return null;
    candidate = `https://${trimmed}`;
  } else {
    candidate = trimmed;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // Reject userinfo (e.g., google.com@evil.com)
    if (url.username || url.password) return null;
    if (!url.hostname || !url.hostname.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Validate avatar URL — only http/https allowed.
 */
export function normalizeAvatarUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  for (const proto of UNSAFE_PROTOCOLS) {
    if (lower.startsWith(proto)) return null;
  }

  let candidate: string;
  if (!/^https?:\/\//i.test(trimmed)) {
    if (!/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return null;
    candidate = `https://${trimmed}`;
  } else {
    candidate = trimmed;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (!url.hostname || !url.hostname.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
}
