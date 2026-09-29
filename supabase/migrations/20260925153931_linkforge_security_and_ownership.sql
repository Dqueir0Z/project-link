-- ============================================================
-- LinkForge Security & Ownership Migration
-- Adds owner_id, rewrites RLS for authenticated-only access,
-- adds resolve_public_page RPC, adds DB constraints.
-- Does NOT delete existing data. Legacy rows may have NULL owner_id.
-- ============================================================

-- ============================================================
-- 1. Add owner_id to links and link_pages
-- ============================================================
ALTER TABLE links ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE link_pages ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- ============================================================
-- 2. Drop ALL existing policies on all tables
-- ============================================================
DROP POLICY IF EXISTS "anon_select_links" ON links;
DROP POLICY IF EXISTS "anon_insert_links" ON links;
DROP POLICY IF EXISTS "anon_update_links" ON links;
DROP POLICY IF EXISTS "anon_delete_links" ON links;

DROP POLICY IF EXISTS "anon_select_click_events" ON click_events;
DROP POLICY IF EXISTS "anon_insert_click_events" ON click_events;
DROP POLICY IF EXISTS "anon_delete_click_events" ON click_events;

DROP POLICY IF EXISTS "anon_select_link_pages" ON link_pages;
DROP POLICY IF EXISTS "anon_insert_link_pages" ON link_pages;
DROP POLICY IF EXISTS "anon_update_link_pages" ON link_pages;
DROP POLICY IF EXISTS "anon_delete_link_pages" ON link_pages;

DROP POLICY IF EXISTS "anon_select_page_links" ON page_links;
DROP POLICY IF EXISTS "anon_insert_page_links" ON page_links;
DROP POLICY IF EXISTS "anon_update_page_links" ON page_links;
DROP POLICY IF EXISTS "anon_delete_page_links" ON page_links;

-- ============================================================
-- 3. New RLS policies — links (owner-only)
-- ============================================================
CREATE POLICY "links_select_own" ON links FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "links_insert_own" ON links FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "links_update_own" ON links FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "links_delete_own" ON links FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============================================================
-- 4. New RLS policies — click_events (owner SELECT only)
-- ============================================================
CREATE POLICY "click_events_select_own" ON click_events FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM links l
      WHERE l.id = click_events.link_id
      AND l.owner_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for click_events via PostgREST.
-- Click insertion happens only through the resolve_short_link SECURITY DEFINER RPC.

-- ============================================================
-- 5. New RLS policies — link_pages (owner-only)
-- ============================================================
CREATE POLICY "link_pages_select_own" ON link_pages FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "link_pages_insert_own" ON link_pages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "link_pages_update_own" ON link_pages FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "link_pages_delete_own" ON link_pages FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============================================================
-- 6. New RLS policies — page_links (ownership through parent page)
-- ============================================================
CREATE POLICY "page_links_select_own" ON page_links FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM link_pages p
      WHERE p.id = page_links.page_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "page_links_insert_own" ON page_links FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM link_pages p
      WHERE p.id = page_links.page_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "page_links_update_own" ON page_links FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM link_pages p
      WHERE p.id = page_links.page_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "page_links_delete_own" ON page_links FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM link_pages p
      WHERE p.id = page_links.page_id
      AND p.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 7. Update resolve_short_link — keep public, SECURITY DEFINER
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_short_link(p_short_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link links%ROWTYPE;
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

  UPDATE links
    SET click_count = click_count + 1,
        last_clicked_at = now()
    WHERE id = v_link.id;

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
-- 8. New RPC: resolve_public_page — public, SECURITY DEFINER
-- Returns only active page + active page_links. No owner_id.
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_public_page(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page link_pages%ROWTYPE;
  v_links jsonb;
BEGIN
  SELECT * INTO v_page FROM link_pages
    WHERE slug = p_slug AND is_active = true
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pl.id,
        'label', pl.label,
        'url', pl.url,
        'position', pl.position
      ) ORDER BY pl.position
    ),
    '[]'::jsonb
  ) INTO v_links
  FROM page_links pl
  WHERE pl.page_id = v_page.id AND pl.is_active = true;

  RETURN jsonb_build_object(
    'status', 'found',
    'page', jsonb_build_object(
      'id', v_page.id,
      'slug', v_page.slug,
      'title', v_page.title,
      'description', v_page.description,
      'avatar_url', v_page.avatar_url
    ),
    'links', v_links
  );
END;
$$;

-- ============================================================
-- 9. Update check_code_available — add new reserved routes
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
    'p','qr','create','editar','novo',
    'signup','register','auth','logout'
  ];
BEGIN
  IF p_code = ANY(v_reserved) THEN
    RETURN false;
  END IF;

  SELECT EXISTS(SELECT 1 FROM links WHERE short_code = p_code) INTO v_exists;
  IF v_exists THEN
    RETURN false;
  END IF;

  SELECT EXISTS(SELECT 1 FROM link_pages WHERE slug = p_code) INTO v_exists;
  IF v_exists THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- ============================================================
-- 10. Database constraints for short_code and slug format
-- Uses NOT VALID so existing rows are not rejected
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'links_short_code_format'
  ) THEN
    ALTER TABLE links ADD CONSTRAINT links_short_code_format
      CHECK (char_length(short_code) >= 3
        AND char_length(short_code) <= 50
        AND short_code ~ '^[a-z0-9_-]+$'
      ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'link_pages_slug_format'
  ) THEN
    ALTER TABLE link_pages ADD CONSTRAINT link_pages_slug_format
      CHECK (char_length(slug) >= 3
        AND char_length(slug) <= 50
        AND slug ~ '^[a-z0-9_-]+$'
      ) NOT VALID;
  END IF;
END $$;

-- ============================================================
-- 11. Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION resolve_short_link(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_public_page(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_code_available(text) TO anon, authenticated;
