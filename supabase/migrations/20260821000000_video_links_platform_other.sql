-- Allow "other" platform on video_links for storage sites we don't enumerate yet.
ALTER TABLE "public"."video_links"
    DROP CONSTRAINT IF EXISTS "video_links_platform_check";

ALTER TABLE "public"."video_links"
    ADD CONSTRAINT "video_links_platform_check"
    CHECK (platform = ANY (ARRAY['hudl', 'youtube', 'vimeo', 'other']));
