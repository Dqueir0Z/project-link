import { supabase } from './supabase';
import type { Link, ClickEvent, ExpirationOption, ResolveStatus } from '@/types';
import { normalizeUrl } from '@/utils/url';
import { normalizeAlias, isValidAlias, generateShortCode, isReservedRoute } from '@/utils/alias';
import { computeExpiration } from '@/utils/date';

export async function checkCodeAvailable(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_code_available', { p_code: code });
  if (error) return false;
  return data === true;
}

export async function createLink(params: {
  destinationUrl: string;
  alias?: string;
  expiration: ExpirationOption;
  customDate?: string;
}): Promise<{ link: Link | null; error: string | null }> {
  const originalUrl = normalizeUrl(params.destinationUrl);
  if (!originalUrl) {
    return { link: null, error: 'Digite uma URL válida.' };
  }

  let shortCode: string;

  if (params.alias && params.alias.trim()) {
    const alias = normalizeAlias(params.alias);
    if (!isValidAlias(alias)) {
      return { link: null, error: 'O alias deve ter entre 3 e 50 caracteres e conter apenas letras, números, hífens e underscores.' };
    }
    if (isReservedRoute(alias)) {
      return { link: null, error: 'Este alias é uma rota reservada e não pode ser usado.' };
    }
    const available = await checkCodeAvailable(alias);
    if (!available) {
      return { link: null, error: 'Este alias já está em uso.' };
    }
    shortCode = alias;
  } else {
    // Generate unique random code
    let attempts = 0;
    let code = '';
    while (attempts < 10) {
      code = generateShortCode();
      const available = await checkCodeAvailable(code);
      if (available) {
        shortCode = code;
        break;
      }
      attempts++;
    }
    if (!shortCode) {
      return { link: null, error: 'Não foi possível gerar um código único. Tente novamente.' };
    }
  }

  const expiresAt = computeExpiration(params.expiration, params.customDate);

  const { data, error } = await supabase
    .from('links')
    .insert({
      original_url: originalUrl,
      short_code: shortCode,
      expires_at: expiresAt,
      is_active: true,
      click_count: 0,
    })
    .select()
    .single();

  if (error) {
    return { link: null, error: 'Erro ao criar link. Tente novamente.' };
  }

  return { link: data as Link, error: null };
}

export async function getAllLinks(): Promise<Link[]> {
  const { data, error } = await supabase
    .from('links')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Link[];
}

export async function getLinkById(id: string): Promise<Link | null> {
  const { data, error } = await supabase
    .from('links')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Link;
}

export async function getLinkByShortCode(shortCode: string): Promise<Link | null> {
  const { data, error } = await supabase
    .from('links')
    .select('*')
    .eq('short_code', shortCode)
    .maybeSingle();

  if (error || !data) return null;
  return data as Link;
}

export async function resolveShortLink(shortCode: string): Promise<{ status: ResolveStatus; originalUrl?: string }> {
  const { data, error } = await supabase.rpc('resolve_short_link', { p_short_code: shortCode });
  if (error || !data) return { status: 'not_found' };

  const result = data as { status: string; original_url?: string };
  return { status: result.status as ResolveStatus, originalUrl: result.original_url };
}

export async function updateLink(id: string, params: {
  originalUrl?: string;
  alias?: string;
  expiration?: ExpirationOption;
  customDate?: string;
}): Promise<{ link: Link | null; error: string | null }> {
  const updates: Record<string, unknown> = {};

  if (params.originalUrl !== undefined) {
    const normalized = normalizeUrl(params.originalUrl);
    if (!normalized) {
      return { link: null, error: 'Digite uma URL válida.' };
    }
    updates.original_url = normalized;
  }

  if (params.alias !== undefined) {
    const alias = normalizeAlias(params.alias);
    if (!isValidAlias(alias)) {
      return { link: null, error: 'O alias deve ter entre 3 e 50 caracteres e conter apenas letras, números, hífens e underscores.' };
    }
    if (isReservedRoute(alias)) {
      return { link: null, error: 'Este alias é uma rota reservada e não pode ser usado.' };
    }
    const available = await checkCodeAvailable(alias);
    if (!available) {
      // Check if it's our own link
      const current = await getLinkById(id);
      if (current && current.short_code !== alias) {
        return { link: null, error: 'Este alias já está em uso.' };
      }
    }
    updates.short_code = alias;
  }

  if (params.expiration !== undefined) {
    updates.expires_at = computeExpiration(params.expiration, params.customDate);
  }

  const { data, error } = await supabase
    .from('links')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { link: null, error: 'Erro ao atualizar link.' };
  }

  return { link: data as Link, error: null };
}

export async function toggleLinkActive(id: string, active: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('links')
    .update({ is_active: active })
    .eq('id', id);
  return !error;
}

export async function deleteLink(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('links')
    .delete()
    .eq('id', id);
  return !error;
}

export async function getClickEvents(linkId: string): Promise<ClickEvent[]> {
  const { data, error } = await supabase
    .from('click_events')
    .select('*')
    .eq('link_id', linkId)
    .order('clicked_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as ClickEvent[];
}

export async function getDashboardStats(): Promise<{ totalLinks: number; totalClicks: number; activeLinks: number }> {
  const links = await getAllLinks();
  const totalLinks = links.length;
  const totalClicks = links.reduce((sum, l) => sum + l.click_count, 0);
  const activeLinks = links.filter(l => l.is_active && !l.expires_at).length + links.filter(l => l.is_active && l.expires_at && new Date(l.expires_at).getTime() > Date.now()).length;
  return { totalLinks, totalClicks, activeLinks };
}
