const RESERVED_ROUTES = [
  'admin', 'api', 'links', 'about', 'login', 'dashboard', 'settings',
  'pages', '404', 'iniciar', 'meus-links', 'minhas-paginas', 'sobre',
  'p', 'qr', 'create', 'editar', 'novo',
];

const ALIAS_REGEX = /^[a-z0-9_-]+$/;

export function normalizeAlias(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '');
}

export function isValidAlias(input: string): boolean {
  const alias = normalizeAlias(input);
  if (alias.length < 3 || alias.length > 50) return false;
  if (!ALIAS_REGEX.test(alias)) return false;
  return true;
}

export function isReservedRoute(code: string): boolean {
  return RESERVED_ROUTES.includes(normalizeAlias(code));
}

const CHARS = 'abcdefghijkmnpqrstuvwxyz23456789';

export function generateShortCode(min = 5, max = 8): string {
  const len = min + Math.floor(Math.random() * (max - min + 1));
  let result = '';
  for (let i = 0; i < len; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

export function suggestAliasFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    // Take the last meaningful segment
    let suggestion = segments[segments.length - 1]
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/^-+|-+$/g, '');

    if (suggestion.length < 3 || suggestion.length > 50) return null;
    if (!ALIAS_REGEX.test(suggestion)) return null;

    return suggestion;
  } catch {
    return null;
  }
}
