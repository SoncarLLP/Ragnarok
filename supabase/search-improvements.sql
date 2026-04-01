-- ============================================================
-- SONCAR – Search Improvements Migration
-- Run in the Supabase SQL editor AFTER all existing migrations
-- ============================================================

-- ── 1. Enable pg_trgm extension ─────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ── 2. Trigram GIN indexes on products ──────────────────────
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm
  ON public.products USING gin(description_html gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_slug_trgm
  ON public.products USING gin(slug gin_trgm_ops);

-- custom_segments is JSONB — index its text representation
CREATE INDEX IF NOT EXISTS idx_products_custom_segments_trgm
  ON public.products USING gin((custom_segments::text) gin_trgm_ops);


-- ── 3. Trigram GIN indexes on posts ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_content_trgm
  ON public.posts USING gin(content gin_trgm_ops)
  WHERE content IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_ingredients_trgm
  ON public.posts USING gin(ingredients gin_trgm_ops)
  WHERE ingredients IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_method_trgm
  ON public.posts USING gin(method gin_trgm_ops)
  WHERE method IS NOT NULL;


-- ── 4. Trigram GIN indexes on profiles ──────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON public.profiles USING gin(full_name gin_trgm_ops)
  WHERE full_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING gin(username gin_trgm_ops)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_bio_trgm
  ON public.profiles USING gin(bio gin_trgm_ops)
  WHERE bio IS NOT NULL;


-- ── 5. Trigram GIN indexes on messages ──────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_content_trgm
  ON public.messages USING gin(content gin_trgm_ops)
  WHERE content IS NOT NULL;


-- ── 6. Trigram GIN indexes on notifications ─────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_message_trgm
  ON public.notifications USING gin(message gin_trgm_ops)
  WHERE message IS NOT NULL;


-- ── 7. search_logs table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.search_logs (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  query        text        NOT NULL,
  result_count integer     NOT NULL DEFAULT 0,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can read all search logs
DROP POLICY IF EXISTS "super admins can read search_logs" ON public.search_logs;
CREATE POLICY "super admins can read search_logs"
  ON public.search_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Service role / any server call can insert (search logs are written server-side)
DROP POLICY IF EXISTS "service role can insert search_logs" ON public.search_logs;
CREATE POLICY "service role can insert search_logs"
  ON public.search_logs FOR INSERT
  WITH CHECK (true);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at
  ON public.search_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_logs_query
  ON public.search_logs (lower(query));


-- ── 8. search_synonyms table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  term       text        NOT NULL UNIQUE,
  synonyms   text[]      NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;

-- Anyone can read synonyms (needed for search to work for all users)
DROP POLICY IF EXISTS "anyone can read search_synonyms" ON public.search_synonyms;
CREATE POLICY "anyone can read search_synonyms"
  ON public.search_synonyms FOR SELECT
  USING (true);

-- Super admins can manage synonyms
DROP POLICY IF EXISTS "super admins can manage search_synonyms" ON public.search_synonyms;
CREATE POLICY "super admins can manage search_synonyms"
  ON public.search_synonyms FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "super admins can insert search_synonyms" ON public.search_synonyms;
CREATE POLICY "super admins can insert search_synonyms"
  ON public.search_synonyms FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );


-- ── 9. Default synonym pairs ────────────────────────────────
INSERT INTO public.search_synonyms (term, synonyms) VALUES
  ('protein',     ARRAY['blend', 'shake', 'whey', 'supplement', 'powder', 'isolate']),
  ('gains',       ARRAY['results', 'progress', 'improvement', 'muscle', 'growth']),
  ('workout',     ARRAY['training', 'exercise', 'gym', 'session', 'routine']),
  ('pre-workout', ARRAY['pre workout', 'energy', 'pump', 'preworkout', 'pre work out']),
  ('creatine',    ARRAY['strength', 'power', 'performance', 'endurance']),
  ('recovery',    ARRAY['rest', 'repair', 'soreness', 'inflammation', 'heal']),
  ('nutrition',   ARRAY['diet', 'food', 'eating', 'macros', 'calories', 'fuel']),
  ('freya',       ARRAY['freyja', 'frejya', 'freia']),
  ('freyja',      ARRAY['freya', 'frejya', 'freia']),
  ('bloom',       ARRAY['blossom', 'glow', 'radiance']),
  ('hydration',   ARRAY['hydrate', 'water', 'electrolytes', 'minerals']),
  ('loki',        ARRAY['fire', 'energy', 'bold', 'mythic'])
ON CONFLICT (term) DO NOTHING;


-- ── 10. Fuzzy search function for products ──────────────────
CREATE OR REPLACE FUNCTION public.fuzzy_search_products(
  query_text        text,
  similarity_threshold float  DEFAULT 0.15,
  limit_count       int      DEFAULT 20,
  offset_count      int      DEFAULT 0
)
RETURNS TABLE(
  id                uuid,
  slug              text,
  name              text,
  description_html  text,
  price_pence       integer,
  primary_image_url text,
  match_rank        float
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, slug, name, description_html, price_pence, primary_image_url,
         MAX(rank) AS match_rank
  FROM (
    -- Method 1: Full-text search (highest weight)
    SELECT p.id, p.slug, p.name, p.description_html, p.price_pence, p.primary_image_url,
           (ts_rank(
             to_tsvector('english',
               coalesce(p.name, '') || ' ' ||
               coalesce(regexp_replace(coalesce(p.description_html, ''), '<[^>]*>', ' ', 'g'), '')
             ),
             plainto_tsquery('english', query_text)
           ) + 0.5) AS rank
    FROM products p
    WHERE p.visibility = 'published'
      AND to_tsvector('english',
            coalesce(p.name, '') || ' ' ||
            coalesce(regexp_replace(coalesce(p.description_html, ''), '<[^>]*>', ' ', 'g'), ''))
          @@ plainto_tsquery('english', query_text)

    UNION ALL

    -- Method 2: Trigram similarity on product name
    SELECT p.id, p.slug, p.name, p.description_html, p.price_pence, p.primary_image_url,
           GREATEST(
             similarity(lower(query_text), lower(p.name)),
             word_similarity(lower(query_text), lower(p.name))
           ) AS rank
    FROM products p
    WHERE p.visibility = 'published'
      AND GREATEST(
        similarity(lower(query_text), lower(p.name)),
        word_similarity(lower(query_text), lower(p.name))
      ) >= similarity_threshold

    UNION ALL

    -- Method 3: ILIKE partial match (lowest weight)
    SELECT p.id, p.slug, p.name, p.description_html, p.price_pence, p.primary_image_url,
           0.1 AS rank
    FROM products p
    WHERE p.visibility = 'published'
      AND (
        p.name          ILIKE '%' || query_text || '%'
        OR p.description_html ILIKE '%' || query_text || '%'
        OR p.slug       ILIKE '%' || query_text || '%'
        OR (p.custom_segments::text) ILIKE '%' || query_text || '%'
      )
  ) all_matches
  GROUP BY id, slug, name, description_html, price_pence, primary_image_url
  ORDER BY match_rank DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;


-- ── 11. Fuzzy search function for posts ─────────────────────
CREATE OR REPLACE FUNCTION public.fuzzy_search_posts(
  query_text        text,
  similarity_threshold float  DEFAULT 0.15,
  limit_count       int      DEFAULT 20,
  offset_count      int      DEFAULT 0
)
RETURNS TABLE(
  id         uuid,
  content    text,
  categories text[],
  created_at timestamptz,
  type       text,
  user_id    uuid,
  match_rank float
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, content, categories, created_at, type, user_id,
         MAX(rank) AS match_rank
  FROM (
    -- Method 1: Full-text search
    SELECT p.id, p.content, p.categories, p.created_at, p.type, p.user_id,
           (ts_rank(
             to_tsvector('english',
               coalesce(p.content, '') || ' ' ||
               coalesce(p.ingredients, '') || ' ' ||
               coalesce(p.method, '')
             ),
             plainto_tsquery('english', query_text)
           ) + 0.5) AS rank
    FROM posts p
    WHERE p.content IS NOT NULL
      AND to_tsvector('english',
            coalesce(p.content, '') || ' ' ||
            coalesce(p.ingredients, '') || ' ' ||
            coalesce(p.method, ''))
          @@ plainto_tsquery('english', query_text)

    UNION ALL

    -- Method 2: Trigram similarity on content
    SELECT p.id, p.content, p.categories, p.created_at, p.type, p.user_id,
           word_similarity(lower(query_text), lower(coalesce(p.content, ''))) AS rank
    FROM posts p
    WHERE p.content IS NOT NULL
      AND word_similarity(lower(query_text), lower(coalesce(p.content, ''))) >= similarity_threshold

    UNION ALL

    -- Method 3: ILIKE partial match
    SELECT p.id, p.content, p.categories, p.created_at, p.type, p.user_id,
           0.1 AS rank
    FROM posts p
    WHERE p.content IS NOT NULL
      AND (
        p.content     ILIKE '%' || query_text || '%'
        OR p.ingredients ILIKE '%' || query_text || '%'
        OR p.method   ILIKE '%' || query_text || '%'
      )
  ) all_matches
  GROUP BY id, content, categories, created_at, type, user_id
  ORDER BY match_rank DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;


-- ── 12. Fuzzy search function for members ───────────────────
CREATE OR REPLACE FUNCTION public.fuzzy_search_members(
  query_text           text,
  similarity_threshold float  DEFAULT 0.15,
  limit_count          int    DEFAULT 20,
  offset_count         int    DEFAULT 0
)
RETURNS TABLE(
  id                      uuid,
  full_name               text,
  username                text,
  avatar_url              text,
  tier                    text,
  privacy_mode            text,
  bio                     text,
  display_name_preference text,
  match_rank              float
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, username, avatar_url, tier, privacy_mode, bio, display_name_preference,
         MAX(rank) AS match_rank
  FROM (
    -- Method 1: Full-text search
    SELECT p.id, p.full_name, p.username, p.avatar_url, p.tier, p.privacy_mode, p.bio, p.display_name_preference,
           (ts_rank(
             to_tsvector('english',
               coalesce(p.full_name, '') || ' ' ||
               coalesce(p.username, '') || ' ' ||
               coalesce(p.bio, '')
             ),
             plainto_tsquery('english', query_text)
           ) + 0.5) AS rank
    FROM profiles p
    WHERE to_tsvector('english',
            coalesce(p.full_name, '') || ' ' ||
            coalesce(p.username, '') || ' ' ||
            coalesce(p.bio, ''))
          @@ plainto_tsquery('english', query_text)

    UNION ALL

    -- Method 2: Trigram similarity on name/username
    SELECT p.id, p.full_name, p.username, p.avatar_url, p.tier, p.privacy_mode, p.bio, p.display_name_preference,
           GREATEST(
             word_similarity(lower(query_text), lower(coalesce(p.full_name, ''))),
             word_similarity(lower(query_text), lower(coalesce(p.username, '')))
           ) AS rank
    FROM profiles p
    WHERE GREATEST(
      word_similarity(lower(query_text), lower(coalesce(p.full_name, ''))),
      word_similarity(lower(query_text), lower(coalesce(p.username, '')))
    ) >= similarity_threshold

    UNION ALL

    -- Method 3: ILIKE partial match
    SELECT p.id, p.full_name, p.username, p.avatar_url, p.tier, p.privacy_mode, p.bio, p.display_name_preference,
           0.1 AS rank
    FROM profiles p
    WHERE (
      p.full_name ILIKE '%' || query_text || '%'
      OR p.username   ILIKE '%' || query_text || '%'
      OR p.bio        ILIKE '%' || query_text || '%'
    )
  ) all_matches
  GROUP BY id, full_name, username, avatar_url, tier, privacy_mode, bio, display_name_preference
  ORDER BY match_rank DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;


-- ── 13. Did-you-mean suggestion function ────────────────────
CREATE OR REPLACE FUNCTION public.search_did_you_mean(query_text text)
RETURNS text
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT suggestion
  FROM (
    SELECT name AS suggestion,
           GREATEST(
             word_similarity(lower(query_text), lower(name)),
             similarity(lower(query_text), lower(name))
           ) AS sim
    FROM products
    WHERE visibility = 'published'
      AND GREATEST(
        word_similarity(lower(query_text), lower(name)),
        similarity(lower(query_text), lower(name))
      ) >= 0.2

    UNION ALL

    SELECT username AS suggestion,
           GREATEST(
             word_similarity(lower(query_text), lower(username)),
             similarity(lower(query_text), lower(username))
           ) AS sim
    FROM profiles
    WHERE username IS NOT NULL
      AND GREATEST(
        word_similarity(lower(query_text), lower(username)),
        similarity(lower(query_text), lower(username))
      ) >= 0.2

    UNION ALL

    SELECT full_name AS suggestion,
           GREATEST(
             word_similarity(lower(query_text), lower(full_name)),
             similarity(lower(query_text), lower(full_name))
           ) AS sim
    FROM profiles
    WHERE full_name IS NOT NULL
      AND GREATEST(
        word_similarity(lower(query_text), lower(full_name)),
        similarity(lower(query_text), lower(full_name))
      ) >= 0.2
  ) candidates
  WHERE lower(suggestion) != lower(query_text)
  ORDER BY sim DESC
  LIMIT 1;
$$;


-- ── 14. Grant execute permissions ───────────────────────────
-- These functions use SECURITY DEFINER so they run as the owner.
-- Grant anon/authenticated execution so the API can call them:
GRANT EXECUTE ON FUNCTION public.fuzzy_search_products  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fuzzy_search_posts     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fuzzy_search_members   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_did_you_mean    TO anon, authenticated;
