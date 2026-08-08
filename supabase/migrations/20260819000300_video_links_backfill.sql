-- Phase A backfill: user_preferences.data.video_links JSONB -> video_links rows.
-- Idempotent: skips any (user_id,url) already present.
-- Guards: non-array data->'video_links' values are coerced to an empty array so a single
-- malformed row can't abort the whole-table backfill transaction; within-batch duplicate
-- urls for the same user are collapsed to the first occurrence (by original position).
INSERT INTO public.video_links (user_id, family_unit_id, platform, url, title, position)
SELECT
    b.user_id,
    b.family_unit_id,
    b.platform,
    b.url,
    b.title,
    b.position
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
WHERE NOT EXISTS (
        SELECT 1 FROM public.video_links vl
        WHERE vl.user_id = b.user_id AND vl.url = b.url
  );
