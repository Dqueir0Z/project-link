export interface Link {
  id: string;
  original_url: string;
  short_code: string;
  created_at: string;
  expires_at: string | null;
  click_count: number;
  last_clicked_at: string | null;
  is_active: boolean;
}

export interface ClickEvent {
  id: string;
  link_id: string;
  clicked_at: string;
  referrer: string | null;
}

export interface LinkPage {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  avatar_url: string | null;
  created_at: string;
  is_active: boolean;
}

export interface PageLink {
  id: string;
  page_id: string;
  label: string;
  url: string;
  position: number;
  is_active: boolean;
}

export interface LinkPageWithLinks extends LinkPage {
  page_links: PageLink[];
}

export type ExpirationOption = 'never' | '24h' | '7d' | '30d' | 'custom';

export type LinkStatus = 'active' | 'expired' | 'inactive';

export type ResolveStatus = 'found' | 'not_found' | 'expired' | 'inactive';
