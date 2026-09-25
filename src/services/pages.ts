import { supabase } from './supabase';
import type { LinkPage, PageLink, LinkPageWithLinks } from '@/types';
import { normalizeAlias, isValidAlias, isReservedRoute } from '@/utils/alias';

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_code_available', { p_code: slug });
  if (error) return false;
  return data === true;
}

export async function getAllPages(): Promise<LinkPage[]> {
  const { data, error } = await supabase
    .from('link_pages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as LinkPage[];
}

export async function getPageById(id: string): Promise<LinkPageWithLinks | null> {
  const { data: pageData, error: pageError } = await supabase
    .from('link_pages')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (pageError || !pageData) return null;

  const { data: linksData } = await supabase
    .from('page_links')
    .select('*')
    .eq('page_id', id)
    .order('position', { ascending: true });

  return {
    ...pageData,
    page_links: (linksData as PageLink[]) || [],
  } as LinkPageWithLinks;
}

export async function getPageBySlug(slug: string): Promise<LinkPageWithLinks | null> {
  const { data: pageData, error: pageError } = await supabase
    .from('link_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (pageError || !pageData) return null;

  const { data: linksData } = await supabase
    .from('page_links')
    .select('*')
    .eq('page_id', pageData.id)
    .eq('is_active', true)
    .order('position', { ascending: true });

  return {
    ...pageData,
    page_links: (linksData as PageLink[]) || [],
  } as LinkPageWithLinks;
}

export async function createPage(params: {
  slug: string;
  title: string;
  description?: string;
  avatarUrl?: string;
}): Promise<{ page: LinkPage | null; error: string | null }> {
  const slug = normalizeAlias(params.slug);
  if (!isValidAlias(slug)) {
    return { page: null, error: 'O slug deve ter entre 3 e 50 caracteres e conter apenas letras, números, hífens e underscores.' };
  }
  if (isReservedRoute(slug)) {
    return { page: null, error: 'Este slug é uma rota reservada e não pode ser usado.' };
  }
  const available = await checkSlugAvailable(slug);
  if (!available) {
    return { page: null, error: 'Este slug já está em uso.' };
  }

  const { data, error } = await supabase
    .from('link_pages')
    .insert({
      slug,
      title: params.title,
      description: params.description || null,
      avatar_url: params.avatarUrl || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return { page: null, error: 'Erro ao criar página.' };
  }

  return { page: data as LinkPage, error: null };
}

export async function updatePage(id: string, params: {
  title?: string;
  description?: string;
  avatarUrl?: string;
  slug?: string;
}): Promise<{ page: LinkPage | null; error: string | null }> {
  const updates: Record<string, unknown> = {};

  if (params.title !== undefined) updates.title = params.title;
  if (params.description !== undefined) updates.description = params.description || null;
  if (params.avatarUrl !== undefined) updates.avatar_url = params.avatarUrl || null;

  if (params.slug !== undefined) {
    const slug = normalizeAlias(params.slug);
    if (!isValidAlias(slug)) {
      return { page: null, error: 'O slug deve ter entre 3 e 50 caracteres e conter apenas letras, números, hífens e underscores.' };
    }
    if (isReservedRoute(slug)) {
      return { page: null, error: 'Este slug é uma rota reservada e não pode ser usado.' };
    }
    // Check if slug is available (or belongs to this page)
    const available = await checkSlugAvailable(slug);
    if (!available) {
      const current = await getPageById(id);
      if (current && current.slug !== slug) {
        return { page: null, error: 'Este slug já está em uso.' };
      }
    }
    updates.slug = slug;
  }

  const { data, error } = await supabase
    .from('link_pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { page: null, error: 'Erro ao atualizar página.' };
  }

  return { page: data as LinkPage, error: null };
}

export async function deletePage(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('link_pages')
    .delete()
    .eq('id', id);
  return !error;
}

export async function togglePageActive(id: string, active: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('link_pages')
    .update({ is_active: active })
    .eq('id', id);
  return !error;
}

export async function addPageLink(pageId: string, label: string, url: string): Promise<PageLink | null> {
  // Get current max position
  const { data: existing } = await supabase
    .from('page_links')
    .select('position')
    .eq('page_id', pageId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPos = existing && existing.length > 0 ? (existing[0] as PageLink).position + 1 : 0;

  const { data, error } = await supabase
    .from('page_links')
    .insert({
      page_id: pageId,
      label,
      url,
      position: nextPos,
      is_active: true,
    })
    .select()
    .single();

  if (error) return null;
  return data as PageLink;
}

export async function updatePageLink(id: string, updates: { label?: string; url?: string; is_active?: boolean }): Promise<boolean> {
  const { error } = await supabase
    .from('page_links')
    .update(updates)
    .eq('id', id);
  return !error;
}

export async function deletePageLink(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('page_links')
    .delete()
    .eq('id', id);
  return !error;
}

export async function reorderPageLinks(pageId: string, orderedIds: string[]): Promise<boolean> {
  const updates = orderedIds.map((id, index) =>
    supabase.from('page_links').update({ position: index }).eq('id', id)
  );

  const results = await Promise.all(updates);
  return results.every(r => !r.error);
}
