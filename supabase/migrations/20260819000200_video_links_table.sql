-- Phase A: canonical video_links table (promoted from user_preferences.data.video_links JSONB).
-- Additive only. JSONB store stays until Phase B/C cutover.

CREATE TABLE IF NOT EXISTS "public"."video_links" (
    "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"           uuid NOT NULL,               -- owning PLAYER (auth user)
    "family_unit_id"    uuid,                         -- parent read access
    "platform"          text NOT NULL,
    "url"               text NOT NULL,
    "title"             text,
    "position"          integer NOT NULL DEFAULT 0,   -- display order 0..4
    "health_status"     text NOT NULL DEFAULT 'unknown',
    "last_health_check" timestamptz,
    "created_at"        timestamptz NOT NULL DEFAULT now(),
    "updated_at"        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "video_links_platform_check"
        CHECK (platform = ANY (ARRAY['hudl','youtube','vimeo'])),
    CONSTRAINT "video_links_health_status_check"
        CHECK (health_status = ANY (ARRAY['healthy','broken','unknown'])),
    CONSTRAINT "video_links_user_id_fkey"
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT "video_links_family_unit_id_fkey"
        FOREIGN KEY (family_unit_id) REFERENCES public.family_units(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_video_links_user_id"        ON "public"."video_links" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_video_links_family_unit_id" ON "public"."video_links" ("family_unit_id");
CREATE INDEX IF NOT EXISTS "idx_video_links_health"         ON "public"."video_links" ("health_status")
    WHERE health_status <> 'healthy';

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION "public"."video_links_set_updated_at"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER "video_links_updated_at_trg"
    BEFORE UPDATE ON "public"."video_links"
    FOR EACH ROW EXECUTE FUNCTION "public"."video_links_set_updated_at"();

-- max-5 backstop (app enforces UX; this guards the DB)
-- Backstop only: COUNT check has a TOCTOU race under concurrent inserts; app layer enforces the UX cap.
CREATE OR REPLACE FUNCTION "public"."video_links_enforce_max5"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF (SELECT count(*) FROM public.video_links WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'video_links limit reached (max 5 per user)';
    END IF;
    RETURN NEW;
END; $$;

CREATE TRIGGER "video_links_max5_trg"
    BEFORE INSERT ON "public"."video_links"
    FOR EACH ROW EXECUTE FUNCTION "public"."video_links_enforce_max5"();

-- RLS (mirrors documents: owner OR family read; owning player writes)
ALTER TABLE "public"."video_links" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_links_select_own_or_family" ON "public"."video_links"
    FOR SELECT USING (
        user_id = auth.uid()
        OR family_unit_id IN (
            SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "video_links_insert_owner_player" ON "public"."video_links"
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.family_members
                    WHERE user_id = auth.uid() AND role = 'player')
        AND (
            family_unit_id IS NULL
            OR family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "video_links_update_owner_player" ON "public"."video_links"
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.family_members
                    WHERE user_id = auth.uid() AND role = 'player')
        AND (
            family_unit_id IS NULL
            OR family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "video_links_delete_owner_player" ON "public"."video_links"
    FOR DELETE USING (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.family_members
                    WHERE user_id = auth.uid() AND role = 'player')
    );
