export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `há ${Math.floor(diff / 86400)} dias`;
  return formatDate(iso);
}

export function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export function getLinkStatus(
  isActive: boolean,
  expiresAt: string | null
): 'active' | 'expired' | 'inactive' {
  if (!isActive) return 'inactive';
  if (isExpired(expiresAt)) return 'expired';
  return 'active';
}

// Convert a local datetime-local string (yyyy-MM-ddTHH:mm) to UTC ISO
export function localToUtc(localStr: string): string {
  // datetime-local gives us the user's local time as a string
  // new Date() interprets it as local time, so toISOString() converts to UTC
  const d = new Date(localStr);
  return d.toISOString();
}

// Convert UTC ISO to a datetime-local string for the input field
export function utcToLocalInput(iso: string): string {
  const d = new Date(iso);
  // Build local datetime-local string manually to avoid timezone shift
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function computeExpiration(option: 'never' | '24h' | '7d' | '30d' | 'custom', customDate?: string): string | null {
  if (option === 'never') return null;
  const now = new Date();
  if (option === '24h') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  if (option === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d.toISOString();
  }
  if (option === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() + 30);
    return d.toISOString();
  }
  if (option === 'custom' && customDate) {
    return localToUtc(customDate);
  }
  return null;
}
