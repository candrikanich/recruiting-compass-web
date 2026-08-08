-- Phase A backfill: user_preferences.data.video_links JSONB -> video_links rows.
-- Idempotent: skips any (user_id,url) already present.
INSERT INTO public.video_links (user_id, family_unit_id, platform, url, title, position)
SELECT
    up.user_id,
    fm.family_unit_id,
    elem->>'platform'                              AS platform,
    elem->>'url'                                   AS url,
    NULLIF(elem->>'title','')                      AS title,
    (ord - 1)::int                                 AS position
FROM public.user_preferences up
CROSS JOIN LATERAL jsonb_array_elements(up.data->'video_links')
                   WITH ORDINALITY AS t(elem, ord)
LEFT JOIN public.family_members fm
       ON fm.user_id = up.user_id AND fm.role = 'player'
WHERE up.category = 'player'
  AND jsonb_typeof(up.data->'video_links') = 'array'
  AND elem->>'url' IS NOT NULL
  AND elem->>'platform' IN ('hudl','youtube','vimeo')
  AND NOT EXISTS (
        SELECT 1 FROM public.video_links vl
        WHERE vl.user_id = up.user_id AND vl.url = elem->>'url'
  );
