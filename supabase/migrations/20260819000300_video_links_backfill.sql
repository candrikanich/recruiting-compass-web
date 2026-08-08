-- Phase A backfill: user_preferences.data.video_links JSONB -> video_links rows.
-- Idempotent: skips any (user_id,url) already present.
-- Guards: non-array data->'video_links' values are coerced to an empty array so a single
-- malformed row can't abort the whole-table backfill transaction; within-batch duplicate
-- urls for the same user are collapsed to the first occurrence (by original position); each
-- user is capped to the first 5 links by position so the video_links_max5_trg BEFORE-INSERT
-- trigger (which counts rows already inserted earlier in this same statement) can't abort the
-- transaction for users with 6+ distinct valid urls — links beyond 5 are intentionally dropped,
-- matching the app's own max-5 limit.
INSERT INTO public.video_links (user_id, family_unit_id, platform, url, title, position)
SELECT
    capped.user_id,
    capped.family_unit_id,
    capped.platform,
    capped.url,
    capped.title,
    capped.position
FROM (
    SELECT b.*, row_number() OVER (PARTITION BY b.user_id ORDER BY b.position) AS rn
    FROM (
        SELECT DISTINCT ON (up.user_id, elem->>'url')
            up.user_id                                     AS user_id,
            fm.family_unit_id                              AS family_unit_id,
            elem->>'platform'                              AS platform,
            elem->>'url'                                   AS url,
            NULLIF(elem->>'title','')                      AS title,
            (ord - 1)::int                                 AS position
        FROM public.user_preferences up
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(up.data->'video_links') = 'array'
                 THEN up.data->'video_links'
                 ELSE '[]'::jsonb END
        ) WITH ORDINALITY AS t(elem, ord)
        LEFT JOIN public.family_members fm
               ON fm.user_id = up.user_id AND fm.role = 'player'
        WHERE up.category = 'player'
          AND elem->>'url' IS NOT NULL
          AND elem->>'platform' IN ('hudl','youtube','vimeo')
        ORDER BY up.user_id, elem->>'url', ord
    ) b
) capped
WHERE capped.rn <= 5
  AND NOT EXISTS (
        SELECT 1 FROM public.video_links vl
        WHERE vl.user_id = capped.user_id AND vl.url = capped.url
  );
