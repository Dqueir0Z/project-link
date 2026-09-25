/*
# LinkForge - Core Schema

## Overview
Creates the complete database schema for LinkForge, a URL shortener with link-in-bio pages.
Single-tenant app (no auth) — all tables allow anon + authenticated CRUD.

## New Tables

### links
- id (uuid, primary key)
- original_url (text, not null) — destination URL
- short_code (text, unique, not null) — the short code/alias
- created_at (timestamptz, default now)
- expires_at (timestamptz, nullable) — expiration time
- click_count (integer, default 0)
- last_clicked_at (timestamptz, nullable)
- is_active (boolean, default true)

### click_events
- id (uuid, primary key)
- link_id (uuid, references links, on delete cascade)
- clicked_at (timestamptz, default now)
- referrer (text, nullable)

### link_pages
- id (uuid, primary key)
- slug (text, unique, not null) — page slug
- title (text, not null) — profile name
- description (text, nullable)
- avatar_url (text, nullable)
- created_at (timestamptz, default now)
- is_active (boolean, default true)

### page_links
- id (uuid, primary key)
- page_id (uuid, references link_pages, on delete cascade)
- label (text, not null) — button text
- url (text, not null) — destination
- position (integer, default 0) — sort order
- is_active (boolean, default true)

## RPC Functions

### resolve_short_link(p_short_code text)
Looks up a link by short_code. If found, active, and not expired:
- Increments click_count
- Updates last_clicked_at
- Inserts a click_event
- Returns the original_url
Returns status codes: 'found', 'not_found', 'expired', 'inactive'

### check_code_available(p_code text)
Returns true if the code is available (not used in links.short_code or link_pages.slug,
and not a reserved route).

## Security
- RLS enabled on all tables.
- Anon + authenticated CRUD allowed (single-tenant, no auth app).
- RPC functions use SECURITY DEFINER so they can update click_count safely.
*/

-- ============================================================
-- links
-- ============================================================
CREATE TABLE IF NOT EXISTS links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_url text NOT NULL,
  short_code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  click_count integer NOT NULL DEFAULT 0,
  last_clicked_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_links" ON links;
CREATE POLICY "anon_select_links" ON links FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_links" ON links;
CREATE POLICY "anon_insert_links" ON links FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_links" ON links;
CREATE POLICY "anon_update_links" ON links FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_links" ON links;
CREATE POLICY "anon_delete_links" ON links FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code);

-- ============================================================
-- click_events
-- ============================================================
CREATE TABLE IF NOT EXISTS click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  referrer text
);

ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_click_events" ON click_events;
CREATE POLICY "anon_select_click_events" ON click_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_click_events" ON click_events;
CREATE POLICY "anon_insert_click_events" ON click_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_click_events" ON click_events;
CREATE POLICY "anon_delete_click_events" ON click_events FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_click_events_link_id ON click_events (link_id);

-- ============================================================
-- link_pages
-- ============================================================
CREATE TABLE IF NOT EXISTS link_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE link_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_link_pages" ON link_pages;
CREATE POLICY "anon_select_link_pages" ON link_pages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_link_pages" ON link_pages;
CREATE POLICY "anon_insert_link_pages" ON link_pages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_link_pages" ON link_pages;
CREATE POLICY "anon_update_link_pages" ON link_pages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_link_pages" ON link_pages;
CREATE POLICY "anon_delete_link_pages" ON link_pages FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_link_pages_slug ON link_pages (slug);

-- ============================================================
-- page_links
-- ============================================================
CREATE TABLE IF NOT EXISTS page_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES link_pages(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE page_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_page_links" ON page_links;
CREATE POLICY "anon_select_page_links" ON page_links FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_page_links" ON page_links;
CREATE POLICY "anon_insert_page_links" ON page_links FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_page_links" ON page_links;
CREATE POLICY "anon_update_page_links" ON page_links FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_page_links" ON page_links;
CREATE POLICY "anon_delete_page_links" ON page_links FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_page_links_page_id ON page_links (page_id);

-- ============================================================
-- RPC: resolve_short_link
-- Atomically looks up, validates, records click, returns destination
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_short_link(p_short_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link links%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_link FROM links WHERE short_code = p_short_code LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF NOT v_link.is_active THEN
    RETURN jsonb_build_object('status', 'inactive');
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at <= now() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  -- Increment click count and update last_clicked_at
  UPDATE links
    SET click_count = click_count + 1,
        last_clicked_at = now()
    WHERE id = v_link.id;

  -- Record click event
  INSERT INTO click_events (link_id, clicked_at)
    VALUES (v_link.id, now());

  RETURN jsonb_build_object(
    'status', 'found',
    'original_url', v_link.original_url,
    'link_id', v_link.id
  );
END;
$$;

-- ============================================================
-- RPC: check_code_available
-- Checks if a code/slug is available (not in links, not in link_pages, not reserved)
-- ============================================================
CREATE OR REPLACE FUNCTION check_code_available(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
  v_reserved text[] := ARRAY[
    'admin','api','links','about','login','dashboard','settings',
    'pages','404','iniciar','meus-links','minhas-paginas','sobre',
    'p','qr','create','editar','novo'
  ];
BEGIN
  -- Check reserved words
  IF p_code = ANY(v_reserved) THEN
    RETURN false;
  END IF;

  -- Check links table
  SELECT EXISTS(SELECT 1 FROM links WHERE short_code = p_code) INTO v_exists;
  IF v_exists THEN
    RETURN false;
  END IF;

  -- Check link_pages table
  SELECT EXISTS(SELECT 1 FROM link_pages WHERE slug = p_code) INTO v_exists;
  IF v_exists THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION resolve_short_link(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_code_available(text) TO anon, authenticated;
