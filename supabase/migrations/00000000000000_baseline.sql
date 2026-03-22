


-- Enable extensions required by the schema
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."coach_role" AS ENUM (
    'head',
    'assistant',
    'recruiting'
);


ALTER TYPE "public"."coach_role" OWNER TO "postgres";


CREATE TYPE "public"."document_type" AS ENUM (
    'highlight_video',
    'transcript',
    'resume',
    'rec_letter',
    'questionnaire',
    'stats_sheet'
);


ALTER TYPE "public"."document_type" OWNER TO "postgres";


CREATE TYPE "public"."event_type" AS ENUM (
    'showcase',
    'camp',
    'official_visit',
    'unofficial_visit',
    'game'
);


ALTER TYPE "public"."event_type" OWNER TO "postgres";


CREATE TYPE "public"."interaction_direction" AS ENUM (
    'outbound',
    'inbound'
);


ALTER TYPE "public"."interaction_direction" OWNER TO "postgres";


CREATE TYPE "public"."interaction_sentiment" AS ENUM (
    'positive',
    'neutral',
    'negative',
    'very_positive'
);


ALTER TYPE "public"."interaction_sentiment" OWNER TO "postgres";


CREATE TYPE "public"."interaction_type" AS ENUM (
    'email',
    'text',
    'phone_call',
    'in_person_visit',
    'virtual_meeting',
    'camp',
    'showcase',
    'tweet',
    'dm',
    'game',
    'unofficial_visit',
    'official_visit',
    'other'
);


ALTER TYPE "public"."interaction_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'follow_up_reminder',
    'deadline_alert',
    'daily_digest',
    'inbound_interaction'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."recommendation_status" AS ENUM (
    'not_requested',
    'requested',
    'received',
    'submitted'
);


ALTER TYPE "public"."recommendation_status" OWNER TO "postgres";


CREATE TYPE "public"."school_division" AS ENUM (
    'D1',
    'D2',
    'D3',
    'NAIA',
    'JUCO'
);


ALTER TYPE "public"."school_division" OWNER TO "postgres";


CREATE TYPE "public"."school_status" AS ENUM (
    'researching',
    'contacted',
    'interested',
    'offer_received',
    'declined',
    'committed',
    'camp_invite',
    'recruited',
    'official_visit_invited',
    'official_visit_scheduled',
    'not_pursuing'
);


ALTER TYPE "public"."school_status" OWNER TO "postgres";


CREATE TYPE "public"."social_platform" AS ENUM (
    'twitter',
    'instagram'
);


ALTER TYPE "public"."social_platform" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'parent',
    'player'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_audit_log"("p_user_id" "uuid", "p_action" character varying, "p_resource_type" character varying, "p_resource_id" "uuid" DEFAULT NULL::"uuid", "p_table_name" character varying DEFAULT NULL::character varying, "p_description" "text" DEFAULT NULL::"text", "p_old_values" "jsonb" DEFAULT NULL::"jsonb", "p_new_values" "jsonb" DEFAULT NULL::"jsonb", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_status" character varying DEFAULT 'success'::character varying, "p_error_message" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    table_name,
    description,
    old_values,
    new_values,
    ip_address,
    user_agent,
    status,
    error_message,
    metadata
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_table_name,
    p_description,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_user_agent,
    p_status,
    p_error_message,
    p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."create_audit_log"("p_user_id" "uuid", "p_action" character varying, "p_resource_type" character varying, "p_resource_id" "uuid", "p_table_name" character varying, "p_description" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_ip_address" "inet", "p_user_agent" "text", "p_status" character varying, "p_error_message" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_expired_audit_logs"() RETURNS TABLE("deleted_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.audit_logs
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN QUERY SELECT v_deleted;
END;
$$;


ALTER FUNCTION "public"."delete_expired_audit_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."duplicate_data_on_unlink"("p_link_id" "uuid", "p_user_keeping_copy" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    entity RECORD;
    new_school_id UUID;
    new_event_id UUID;
    new_document_id UUID;
  BEGIN
    SET search_path = public;
    -- For each entity NOT originally owned by this user, create a duplicate
    FOR entity IN
      SELECT entity_type, entity_id, original_owner_id
      FROM public.data_ownership_snapshot
      WHERE link_id = p_link_id AND original_owner_id != p_user_keeping_copy
    LOOP
      -- Duplicate schools
      IF entity.entity_type = 'school' THEN
        INSERT INTO public.schools (
          user_id, name, location, division, conference, ranking, is_favorite, website,
          twitter_handle, instagram_handle, status, notes, pros, cons, offer_details,
          academic_info, amenities, created_by, updated_by, created_at, updated_at
        )
        SELECT
          p_user_keeping_copy, name, location, division, conference, ranking,
  is_favorite, website,
          twitter_handle, instagram_handle, status, notes, pros, cons, offer_details,
          academic_info, amenities, created_by, updated_by, created_at,
  CURRENT_TIMESTAMP
        FROM public.schools
        WHERE id = entity.entity_id
        RETURNING id INTO new_school_id;

      -- Duplicate events (update school_id reference if needed)
      ELSIF entity.entity_type = 'event' THEN
        INSERT INTO public.events (
          user_id, school_id, type, name, location, start_date, end_date,
          coaches_present, performance_notes, stats_recorded, cost, registered,
  attended,
          created_by, updated_by, created_at, updated_at
        )
        SELECT
          p_user_keeping_copy, school_id, type, name, location, start_date, end_date,
          coaches_present, performance_notes, stats_recorded, cost, registered,
  attended,
          created_by, updated_by, created_at, CURRENT_TIMESTAMP
        FROM public.events
        WHERE id = entity.entity_id;

      -- Duplicate documents
      ELSIF entity.entity_type = 'document' THEN
        INSERT INTO public.documents (
          user_id, type, title, description, file_url, file_type, version, school_id,
          is_current, shared_with_schools, uploaded_by, created_at, updated_at
        )
        SELECT
          p_user_keeping_copy, type, title, description, file_url, file_type, version,
  school_id,
          is_current, shared_with_schools, p_user_keeping_copy, created_at,
  CURRENT_TIMESTAMP
        FROM public.documents
        WHERE id = entity.entity_id;

      -- Duplicate performance metrics
      ELSIF entity.entity_type = 'performance_metric' THEN
        INSERT INTO public.performance_metrics (
          user_id, recorded_date, metric_type, value, unit, event_id, notes, verified,
  created_at
        )
        SELECT
          p_user_keeping_copy, recorded_date, metric_type, value, unit, event_id, notes,
   verified, created_at
        FROM public.performance_metrics
        WHERE id = entity.entity_id;

      -- Duplicate recommendation letters
      ELSIF entity.entity_type = 'recommendation_letter' THEN
        INSERT INTO public.recommendation_letters (
          user_id, writer_name, writer_title, writer_email, relationship,
  requested_date,
          due_date, received_date, status, schools_submitted_to, document_id, notes,
          created_at, updated_at
        )
        SELECT
          p_user_keeping_copy, writer_name, writer_title, writer_email, relationship,
  requested_date,
          due_date, received_date, status, schools_submitted_to, document_id, notes,
          created_at, CURRENT_TIMESTAMP
        FROM public.recommendation_letters
        WHERE id = entity.entity_id;
      END IF;
    END LOOP;

    -- Delete snapshot after duplication
    DELETE FROM public.data_ownership_snapshot WHERE link_id = p_link_id;
  END;
  $$;


ALTER FUNCTION "public"."duplicate_data_on_unlink"("p_link_id" "uuid", "p_user_keeping_copy" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_old_invitations"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    SET search_path = public;
    UPDATE public.account_links
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP;
  END;
  $$;


ALTER FUNCTION "public"."expire_old_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accessible_athletes"() RETURNS TABLE("athlete_id" "uuid", "family_unit_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT fm_player.user_id, fm_player.family_unit_id
  FROM family_members fm_parent
  JOIN family_members fm_player ON fm_parent.family_unit_id = fm_player.family_unit_id
  WHERE fm_parent.user_id = auth.uid()
    AND fm_player.role = 'player'
  UNION
  SELECT fm.user_id, fm.family_unit_id
  FROM family_members fm
  WHERE fm.user_id = auth.uid()
    AND fm.role = 'player';
END;
$$;


ALTER FUNCTION "public"."get_accessible_athletes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_accessible_athletes"() IS 'Returns all athletes current user can access (as parent or as self)';



CREATE OR REPLACE FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") RETURNS TABLE("task_completion_rate" numeric, "interaction_frequency_score" numeric, "coach_interest_score" numeric, "academic_standing_score" numeric, "last_interaction_date" timestamp with time zone, "school_count" integer, "completed_task_count" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
WITH user_data AS (
  SELECT current_phase FROM public.users WHERE id = p_user_id
),
grade_level_map AS (
  SELECT
    CASE
      WHEN (SELECT current_phase FROM user_data) = 'freshman' THEN 9
      WHEN (SELECT current_phase FROM user_data) = 'sophomore' THEN 10
      WHEN (SELECT current_phase FROM user_data) = 'junior' THEN 11
      ELSE 12
    END AS grade_level
),
required_tasks AS (
  SELECT COUNT(DISTINCT id) as task_count
  FROM public.task
  WHERE grade_level = (SELECT grade_level FROM grade_level_map)
    AND required = true
),
completed_tasks AS (
  SELECT COUNT(DISTINCT task_id) as task_count
  FROM public.athlete_task
  WHERE athlete_id = p_user_id AND status = 'completed'
),
latest_interaction AS (
  SELECT created_at
  FROM public.interactions
  WHERE logged_by = p_user_id
  ORDER BY created_at DESC
  LIMIT 1
),
user_schools AS (
  SELECT COUNT(*) as school_count
  FROM public.schools
  WHERE user_id = p_user_id
),
school_interactions AS (
  SELECT COUNT(DISTINCT school_id) as interaction_count
  FROM public.interactions
  WHERE logged_by = p_user_id
)
SELECT
  CASE
    WHEN (SELECT task_count FROM required_tasks) > 0
    THEN ((SELECT task_count FROM completed_tasks)::NUMERIC / (SELECT task_count FROM required_tasks) * 100)
    ELSE 0::NUMERIC
  END,
  CASE
    WHEN (SELECT school_count FROM user_schools) > 0
    THEN (50 + ((SELECT interaction_count FROM school_interactions)::NUMERIC / (SELECT school_count FROM user_schools) * 50))
    ELSE 0::NUMERIC
  END,
  ((SELECT interaction_count FROM school_interactions)::NUMERIC * 10),
  50::NUMERIC,
  (SELECT created_at FROM latest_interaction),
  (SELECT school_count FROM user_schools),
  (SELECT task_count FROM completed_tasks);
$$;


ALTER FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_linked_user_ids"() RETURNS TABLE("user_id" "uuid")
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  -- Include self
  SELECT auth.uid() AS user_id
  UNION ALL
  -- Include linked account users (both directions)
  SELECT player_user_id AS user_id
  FROM account_links
  WHERE parent_user_id = auth.uid()
  AND status = 'accepted'
  UNION ALL
  SELECT parent_user_id AS user_id
  FROM account_links
  WHERE player_user_id = auth.uid()
  AND status = 'accepted';
END;
$$;


ALTER FUNCTION "public"."get_linked_user_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_primary_family_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_family_id UUID;
BEGIN
  -- If user is a student, return their family
  SELECT fu.id INTO v_family_id
  FROM family_units fu
  WHERE fu.student_user_id = auth.uid();

  IF v_family_id IS NOT NULL THEN
    RETURN v_family_id;
  END IF;

  -- If user is a parent, return their first family (chronologically oldest)
  SELECT fm.family_unit_id INTO v_family_id
  FROM family_members fm
  WHERE fm.user_id = auth.uid() AND fm.role = 'parent'
  ORDER BY fm.added_at ASC
  LIMIT 1;

  RETURN v_family_id;
END;
$$;


ALTER FUNCTION "public"."get_primary_family_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_primary_family_id"() IS 'Returns primary family unit (students: their family, parents: oldest family)';



CREATE OR REPLACE FUNCTION "public"."get_user_family_ids"() RETURNS TABLE("family_unit_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT fm.family_unit_id
  FROM family_members fm
  WHERE fm.user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_user_family_ids"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_family_ids"() IS 'Returns all family units user belongs to (as student or parent)';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    BEGIN
      INSERT INTO public.users (
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        CASE
          WHEN (NEW.raw_user_meta_data ->> 'role') IN ('parent', 'student') THEN
            (NEW.raw_user_meta_data ->> 'role')::user_role
          ELSE
            'student'::user_role
        END,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Log error and continue to avoid blocking auth signup
      RAISE LOG 'Error creating user profile: %', SQLERRM;
    END;

    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_profile_link_view"("link_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  UPDATE profile_tracking_links
  SET view_count = view_count + 1, last_viewed_at = now()
  WHERE id = link_id;
$$;


ALTER FUNCTION "public"."increment_profile_link_view"("link_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_data_owner"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN auth.uid() = target_user_id;
END;
$$;


ALTER FUNCTION "public"."is_data_owner"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_data_owner"("target_user_id" "uuid") IS 'Returns true if current user owns the data (direct ownership, not through link)';



CREATE OR REPLACE FUNCTION "public"."is_parent_viewing_athlete"("target_athlete_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM family_members fm_parent
    JOIN family_members fm_player ON fm_parent.family_unit_id = fm_player.family_unit_id
    WHERE fm_parent.user_id = auth.uid()
      AND fm_parent.role = 'parent'
      AND fm_player.user_id = target_athlete_id
      AND fm_player.role = 'player'
  );
END;
$$;


ALTER FUNCTION "public"."is_parent_viewing_athlete"("target_athlete_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_parent_viewing_athlete"("target_athlete_id" "uuid") IS 'Check if current user is a parent with access to target athlete';



CREATE OR REPLACE FUNCTION "public"."is_parent_viewing_linked_athlete"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.account_links al
    INNER JOIN public.users u ON u.id = auth.uid()
    WHERE al.status = 'accepted'
      AND al.parent_user_id = auth.uid()
      AND al.player_user_id = target_user_id
      AND u.role = 'parent'
  );
END;
$$;


ALTER FUNCTION "public"."is_parent_viewing_linked_athlete"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_parent_viewing_linked_athlete"("target_user_id" "uuid") IS 'Returns true if current user is a parent with accepted link to target user';



CREATE OR REPLACE FUNCTION "public"."safe_jsonb_extract"("obj" "jsonb", "key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF obj IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN obj -> key;
END;
$$;


ALTER FUNCTION "public"."safe_jsonb_extract"("obj" "jsonb", "key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_player_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_player_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."snapshot_data_ownership"("p_link_id" "uuid", "p_parent_id" "uuid", "p_player_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    SET search_path = public;
    -- Snapshot schools
    INSERT INTO public.data_ownership_snapshot (link_id, entity_type, entity_id,
  original_owner_id)
    SELECT p_link_id, 'school', id, user_id
    FROM public.schools
    WHERE user_id IN (p_parent_id, p_player_id);

    -- Snapshot events
    INSERT INTO public.data_ownership_snapshot (link_id, entity_type, entity_id,
  original_owner_id)
    SELECT p_link_id, 'event', id, user_id
    FROM public.events
    WHERE user_id IN (p_parent_id, p_player_id);

    -- Snapshot documents
    INSERT INTO public.data_ownership_snapshot (link_id, entity_type, entity_id,
  original_owner_id)
    SELECT p_link_id, 'document', id, user_id
    FROM public.documents
    WHERE user_id IN (p_parent_id, p_player_id);

    -- Snapshot performance metrics
    INSERT INTO public.data_ownership_snapshot (link_id, entity_type, entity_id,
  original_owner_id)
    SELECT p_link_id, 'performance_metric', id, user_id
    FROM public.performance_metrics
    WHERE user_id IN (p_parent_id, p_player_id);

    -- Snapshot recommendation letters
    INSERT INTO public.data_ownership_snapshot (link_id, entity_type, entity_id,
  original_owner_id)
    SELECT p_link_id, 'recommendation_letter', id, user_id
    FROM public.recommendation_letters
    WHERE user_id IN (p_parent_id, p_player_id);
  END;
  $$;


ALTER FUNCTION "public"."snapshot_data_ownership"("p_link_id" "uuid", "p_parent_id" "uuid", "p_player_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_push_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$                                      
  BEGIN
    PERFORM net.http_post(                   
      url     := 'https://xpxzhqghxecsjhvklsqg.supabase.co/functions/v1/send-push-notification',           
      headers := '{"Content-Type":"application/json"}'::jsonb,                          
      body    := to_jsonb(NEW)             
    );                                       
    RETURN NEW;                            
  END;                                     
  $$;


ALTER FUNCTION "public"."trigger_push_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_follow_up_reminders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_follow_up_reminders_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_social_posts_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_social_posts_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_family_member"("family_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
      SELECT 1
      FROM family_members
      WHERE family_unit_id = family_id
      AND user_id = auth.uid()
    );
  $$;


ALTER FUNCTION "public"."user_is_family_member"("family_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_document_schools"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  SET search_path = public;
  -- Remove school IDs that no longer exist
  NEW.shared_with_schools := (
    SELECT COALESCE(ARRAY_AGG(school_id), ARRAY[]::UUID[])
    FROM UNNEST(NEW.shared_with_schools) AS school_id
    WHERE EXISTS (SELECT 1 FROM schools WHERE id = school_id)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_document_schools"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_event_coaches"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  SET search_path = public;
  -- Remove coach IDs that no longer exist
  NEW.coaches_present := (
    SELECT COALESCE(ARRAY_AGG(coach_id), ARRAY[]::UUID[])
    FROM UNNEST(NEW.coaches_present) AS coach_id
    WHERE EXISTS (SELECT 1 FROM coaches WHERE id = coach_id)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_event_coaches"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_rec_letter_schools"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  SET search_path = public;
  -- Remove school IDs that no longer exist
  NEW.schools_submitted_to := (
    SELECT COALESCE(ARRAY_AGG(school_id), ARRAY[]::UUID[])
    FROM UNNEST(NEW.schools_submitted_to) AS school_id
    WHERE EXISTS (SELECT 1 FROM schools WHERE id = school_id)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_rec_letter_schools"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_links" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "parent_user_id" "uuid",
    "player_user_id" "uuid",
    "invited_email" "text" NOT NULL,
    "initiator_user_id" "uuid" NOT NULL,
    "initiator_role" "text" NOT NULL,
    "invitation_token" "uuid" DEFAULT "extensions"."uuid_generate_v4"(),
    "expires_at" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '7 days'::interval),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "relationship_type" character varying(20),
    "confirmed_at" timestamp with time zone,
    CONSTRAINT "account_links_relationship_type_check" CHECK ((("relationship_type")::"text" = ANY ((ARRAY['parent-player'::character varying, 'parent-parent'::character varying, 'player-parent'::character varying])::"text"[]))),
    CONSTRAINT "account_links_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'pending_acceptance'::"text", 'pending_confirmation'::"text", 'accepted'::"text", 'rejected'::"text", 'expired'::"text"]))),
    CONSTRAINT "either_parent_or_player_null" CHECK (((("parent_user_id" IS NOT NULL) AND ("player_user_id" IS NULL)) OR (("parent_user_id" IS NULL) AND ("player_user_id" IS NOT NULL)) OR (("parent_user_id" IS NOT NULL) AND ("player_user_id" IS NOT NULL))))
);


ALTER TABLE "public"."account_links" OWNER TO "postgres";


COMMENT ON COLUMN "public"."account_links"."status" IS 'Link status: pending_acceptance (awaiting invitee), pending_confirmation (awaiting initiator), accepted, rejected, expired';



COMMENT ON COLUMN "public"."account_links"."relationship_type" IS 'Type of relationship: parent-player, parent-parent, or player-parent';



COMMENT ON COLUMN "public"."account_links"."confirmed_at" IS 'Timestamp when initiator confirmed the link (only set when status = accepted)';



CREATE TABLE IF NOT EXISTS "public"."athlete_task" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'not_started'::character varying,
    "completed_at" timestamp with time zone,
    "is_recovery_task" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "athlete_task_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['not_started'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'skipped'::character varying])::"text"[])))
);


ALTER TABLE "public"."athlete_task" OWNER TO "postgres";


COMMENT ON TABLE "public"."athlete_task" IS 'Track individual athlete progress on each task';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" character varying(50) NOT NULL,
    "resource_type" character varying(100) NOT NULL,
    "resource_id" "uuid",
    "table_name" character varying(100),
    "description" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "status" character varying(20) DEFAULT 'success'::character varying,
    "error_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '1 year'::interval)
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Audit trail for all user actions. Retained for 1 year per GDPR and SOC 2 requirements.';



COMMENT ON COLUMN "public"."audit_logs"."id" IS 'Unique audit log ID';



COMMENT ON COLUMN "public"."audit_logs"."user_id" IS 'User who performed the action';



COMMENT ON COLUMN "public"."audit_logs"."action" IS 'Type of action (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)';



COMMENT ON COLUMN "public"."audit_logs"."resource_type" IS 'Type of resource affected (schools, coaches, interactions, etc.)';



COMMENT ON COLUMN "public"."audit_logs"."resource_id" IS 'ID of the specific resource affected';



COMMENT ON COLUMN "public"."audit_logs"."old_values" IS 'JSON snapshot of values before modification (for UPDATE/DELETE)';



COMMENT ON COLUMN "public"."audit_logs"."new_values" IS 'JSON snapshot of values after modification (for CREATE/UPDATE)';



COMMENT ON COLUMN "public"."audit_logs"."ip_address" IS 'Client IP address for security monitoring';



COMMENT ON COLUMN "public"."audit_logs"."user_agent" IS 'Client user agent string';



COMMENT ON COLUMN "public"."audit_logs"."status" IS 'Status of action (success or failure)';



COMMENT ON COLUMN "public"."audit_logs"."metadata" IS 'Additional context specific to action';



COMMENT ON COLUMN "public"."audit_logs"."expires_at" IS 'Automatic expiry date (1 year after creation)';



CREATE TABLE IF NOT EXISTS "public"."coaches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "role" "public"."coach_role" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "twitter_handle" "text",
    "instagram_handle" "text",
    "notes" "text",
    "last_contact_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "user_id" "uuid" NOT NULL,
    "availability" "jsonb" DEFAULT '{"friday": {"end_time": "17:00", "available": false, "start_time": "09:00"}, "monday": {"end_time": "17:00", "available": false, "start_time": "09:00"}, "sunday": {"end_time": "16:00", "available": false, "start_time": "10:00"}, "tuesday": {"end_time": "17:00", "available": false, "start_time": "09:00"}, "saturday": {"end_time": "16:00", "available": false, "start_time": "10:00"}, "thursday": {"end_time": "17:00", "available": false, "start_time": "09:00"}, "timezone": "UTC", "wednesday": {"end_time": "17:00", "available": false, "start_time": "09:00"}, "blackout_dates": []}'::"jsonb",
    "created_by" "uuid",
    "updated_by" "uuid",
    "family_unit_id" "uuid"
);


ALTER TABLE "public"."coaches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coaches_backup_pre_family" (
    "id" "uuid",
    "school_id" "uuid",
    "role" "public"."coach_role",
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "phone" "text",
    "twitter_handle" "text",
    "instagram_handle" "text",
    "notes" "text",
    "responsiveness_score" integer,
    "last_contact_date" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "user_id" "uuid",
    "availability" "jsonb",
    "created_by" "uuid",
    "updated_by" "uuid",
    "private_notes" "text",
    "family_unit_id" "uuid"
);


ALTER TABLE "public"."coaches_backup_pre_family" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communication_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" character varying(255) NOT NULL,
    "description" "text",
    "type" character varying(50) NOT NULL,
    "subject" "text",
    "body" "text" NOT NULL,
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "unlock_conditions" "jsonb",
    "is_predefined" boolean DEFAULT false,
    "is_favorite" boolean DEFAULT false,
    "use_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "communication_templates_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['email'::character varying, 'message'::character varying, 'phone_script'::character varying])::"text"[])))
);


ALTER TABLE "public"."communication_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_ownership_snapshot" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "link_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "original_owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."data_ownership_snapshot" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deadline_alert_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_table" "text" NOT NULL,
    "source_id" "uuid" NOT NULL,
    "alert_days_before" integer NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "deadline_alert_log_source_table_check" CHECK (("source_table" = ANY (ARRAY['user_deadlines'::"text", 'offers'::"text", 'system_calendar'::"text", 'events'::"text", 'coaches'::"text"])))
);


ALTER TABLE "public"."deadline_alert_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" DEFAULT 'ios'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."device_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."document_type" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "file_url" "text" NOT NULL,
    "file_type" "text",
    "version" integer DEFAULT 1,
    "school_id" "uuid",
    "is_current" boolean DEFAULT true,
    "shared_with_schools" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "last_health_check" timestamp with time zone,
    "health_status" character varying(20) DEFAULT 'unknown'::character varying,
    "family_unit_id" "uuid",
    CONSTRAINT "documents_health_status_check" CHECK ((("health_status")::"text" = ANY ((ARRAY['healthy'::character varying, 'broken'::character varying, 'unknown'::character varying])::"text"[])))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."documents"."health_status" IS 'Video link health: healthy (200 status), broken (non-200 status), unknown (not checked)';



CREATE TABLE IF NOT EXISTS "public"."documents_backup_pre_family" (
    "id" "uuid",
    "user_id" "uuid",
    "type" "public"."document_type",
    "title" "text",
    "description" "text",
    "file_url" "text",
    "file_type" "text",
    "version" integer,
    "school_id" "uuid",
    "is_current" boolean,
    "shared_with_schools" "uuid"[],
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "last_health_check" timestamp with time zone,
    "health_status" character varying(20),
    "family_unit_id" "uuid"
);


ALTER TABLE "public"."documents_backup_pre_family" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "school_id" "uuid",
    "type" "public"."event_type" NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "coaches_present" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "performance_notes" "text",
    "stats_recorded" "jsonb",
    "cost" numeric,
    "registered" boolean DEFAULT false,
    "attended" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "user_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "checkin_time" time without time zone,
    "url" "text",
    "description" "text",
    "event_source" character varying(50),
    "address" "text",
    "city" character varying(100),
    "state" character varying(2),
    "family_unit_id" "uuid"
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events_backup_pre_family" (
    "id" "uuid",
    "school_id" "uuid",
    "type" "public"."event_type",
    "name" "text",
    "location" "text",
    "start_date" "date",
    "end_date" "date",
    "coaches_present" "uuid"[],
    "performance_notes" "text",
    "stats_recorded" "jsonb",
    "cost" numeric,
    "registered" boolean,
    "attended" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "user_id" "uuid",
    "created_by" "uuid",
    "updated_by" "uuid",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "checkin_time" time without time zone,
    "url" "text",
    "description" "text",
    "event_source" character varying(50),
    "address" "text",
    "city" character varying(100),
    "state" character varying(2),
    "family_unit_id" "uuid"
);


ALTER TABLE "public"."events_backup_pre_family" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_code_usage_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_unit_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "code_used" character varying(10) NOT NULL,
    "action" character varying(20) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "family_code_usage_log_action_check" CHECK ((("action")::"text" = ANY ((ARRAY['generated'::character varying, 'joined'::character varying, 'regenerated'::character varying])::"text"[])))
);


ALTER TABLE "public"."family_code_usage_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_unit_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "invited_email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    CONSTRAINT "family_invitations_role_check" CHECK (("role" = ANY (ARRAY['player'::"text", 'parent'::"text"]))),
    CONSTRAINT "family_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."family_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_unit_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(20) NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "family_members_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['player'::character varying, 'parent'::character varying])::"text"[])))
);


ALTER TABLE "public"."family_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."family_members" IS 'Maps users to family units';



COMMENT ON COLUMN "public"."family_members"."role" IS 'Role in family: player (1 per family) or parent (N per family)';



CREATE TABLE IF NOT EXISTS "public"."family_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_name" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "family_code" character varying(10),
    "code_generated_at" timestamp with time zone,
    "pending_player_details" "jsonb",
    "created_by_user_id" "uuid" NOT NULL,
    CONSTRAINT "family_code_format_check" CHECK ((("family_code")::"text" ~ '^FAM-[A-Z0-9]{6}$'::"text"))
);


ALTER TABLE "public"."family_units" OWNER TO "postgres";


COMMENT ON TABLE "public"."family_units" IS 'Family unit: 1 player + N parents';



COMMENT ON COLUMN "public"."family_units"."family_name" IS 'Auto-generated name like "John Doe''s Family"';



CREATE TABLE IF NOT EXISTS "public"."follow_up_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "school_id" "uuid",
    "coach_id" "uuid",
    "interaction_id" "uuid",
    "reminder_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" timestamp with time zone NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "notification_sent" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follow_up_reminders_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "follow_up_reminders_reminder_type_check" CHECK (("reminder_type" = ANY (ARRAY['follow_up'::"text", 'deadline'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."follow_up_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."help_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page" "text" NOT NULL,
    "helpful" boolean NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."help_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."help_feedback" IS 'Thumbs up/down feedback for help center pages';



COMMENT ON COLUMN "public"."help_feedback"."page" IS 'The /help/[slug] path that received feedback';



COMMENT ON COLUMN "public"."help_feedback"."helpful" IS 'true = thumbs up, false = thumbs down';



CREATE TABLE IF NOT EXISTS "public"."interactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "coach_id" "uuid",
    "event_id" "uuid",
    "type" "public"."interaction_type" NOT NULL,
    "direction" "public"."interaction_direction" NOT NULL,
    "subject" "text",
    "content" "text",
    "sentiment" "public"."interaction_sentiment",
    "occurred_at" timestamp with time zone NOT NULL,
    "logged_by" "uuid" NOT NULL,
    "attachments" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_by" "uuid",
    "family_unit_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interactions_backup_pre_family" (
    "id" "uuid",
    "school_id" "uuid",
    "coach_id" "uuid",
    "event_id" "uuid",
    "type" "public"."interaction_type",
    "direction" "public"."interaction_direction",
    "subject" "text",
    "content" "text",
    "sentiment" "public"."interaction_sentiment",
    "occurred_at" timestamp with time zone,
    "logged_by" "uuid",
    "attachments" "text"[],
    "created_at" timestamp with time zone,
    "updated_by" "uuid",
    "family_unit_id" "uuid"
);


ALTER TABLE "public"."interactions_backup_pre_family" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nces_schools" (
    "nces_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "city" "text",
    "state" character(2),
    "zip" "text",
    "latitude" numeric,
    "longitude" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nces_schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "push_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_enabled" boolean DEFAULT true NOT NULL,
    CONSTRAINT "notification_preferences_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['follow_up_reminder'::"text", 'deadline_alert'::"text", 'weekly_digest'::"text", 'inbound_interaction'::"text", 'offer'::"text", 'event'::"text"])))
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text",
    "related_entity_type" "text",
    "related_entity_id" "uuid",
    "scheduled_for" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "priority" character varying(10) DEFAULT 'normal'::character varying,
    "email_sent" boolean DEFAULT false,
    "email_sent_at" timestamp with time zone,
    CONSTRAINT "notifications_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying])::"text"[])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "school_id" "uuid" NOT NULL,
    "coach_id" "uuid",
    "offer_type" "text" NOT NULL,
    "deadline_date" "date",
    "status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "scholarship_amount" numeric(10,2),
    "scholarship_percentage" numeric(5,2),
    "offer_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "conditions" "text",
    "family_unit_id" "uuid"
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_view_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_user_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "viewed_item_type" character varying(50) NOT NULL,
    "viewed_item_id" "uuid",
    "viewed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "parent_must_be_parent" CHECK (("parent_user_id" <> "athlete_id"))
);


ALTER TABLE "public"."parent_view_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."parent_view_log" IS 'Track when parents view items for symmetric visibility';



CREATE TABLE IF NOT EXISTS "public"."performance_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "recorded_date" "date" NOT NULL,
    "metric_type" "text" NOT NULL,
    "value" numeric NOT NULL,
    "unit" "text",
    "event_id" "uuid",
    "notes" "text",
    "verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "family_unit_id" "uuid"
);


ALTER TABLE "public"."performance_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."performance_metrics_backup_pre_family" (
    "id" "uuid",
    "user_id" "uuid",
    "recorded_date" "date",
    "metric_type" "text",
    "value" numeric,
    "unit" "text",
    "event_id" "uuid",
    "notes" "text",
    "verified" boolean,
    "created_at" timestamp with time zone,
    "family_unit_id" "uuid"
);


ALTER TABLE "public"."performance_metrics_backup_pre_family" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "family_unit_id" "uuid" NOT NULL,
    "hash_slug" "text" NOT NULL,
    "vanity_slug" "text",
    "is_published" boolean DEFAULT false NOT NULL,
    "bio" "text",
    "show_academics" boolean DEFAULT true NOT NULL,
    "show_athletic" boolean DEFAULT true NOT NULL,
    "show_film" boolean DEFAULT true NOT NULL,
    "show_schools" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hash_slug_format" CHECK (("hash_slug" ~ '^[a-z0-9]{6}$'::"text")),
    CONSTRAINT "vanity_slug_format" CHECK ((("vanity_slug" IS NULL) OR ("vanity_slug" ~ '^[a-z0-9][a-z0-9\-]{0,28}[a-z0-9]$'::"text")))
);


ALTER TABLE "public"."player_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sport_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."positions" OWNER TO "postgres";


COMMENT ON TABLE "public"."positions" IS 'Standard positions for sports with fixed position lists';



COMMENT ON COLUMN "public"."positions"."sport_id" IS 'Foreign key to sports table';



COMMENT ON COLUMN "public"."positions"."name" IS 'Position name (e.g., "Pitcher", "Goalkeeper")';



COMMENT ON COLUMN "public"."positions"."display_order" IS 'Order for display in UI dropdowns (ascending)';



CREATE TABLE IF NOT EXISTS "public"."preference_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "changed_fields" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."preference_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_tracking_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "ref_token" "text" NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL,
    "last_viewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profile_tracking_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "tracking_link_id" "uuid",
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_agent" "text"
);


ALTER TABLE "public"."profile_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_letters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "writer_name" "text" NOT NULL,
    "writer_title" "text",
    "writer_email" "text",
    "relationship" "text",
    "requested_date" "date",
    "due_date" "date",
    "received_date" "date",
    "status" "public"."recommendation_status" DEFAULT 'not_requested'::"public"."recommendation_status",
    "schools_submitted_to" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "document_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."recommendation_letters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "previous_status" character varying(50),
    "new_status" character varying(50) NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."school_status_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."school_status_history" IS 'Audit trail of school status changes for Story 3.4';



COMMENT ON COLUMN "public"."school_status_history"."previous_status" IS 'Previous status value (nullable for first entry)';



COMMENT ON COLUMN "public"."school_status_history"."new_status" IS 'New status value after change';



COMMENT ON COLUMN "public"."school_status_history"."changed_by" IS 'User ID who made the status change';



COMMENT ON COLUMN "public"."school_status_history"."changed_at" IS 'When the status change occurred';



COMMENT ON COLUMN "public"."school_status_history"."notes" IS 'Optional notes explaining the status change';



CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "division" "public"."school_division",
    "conference" "text",
    "is_favorite" boolean DEFAULT false,
    "website" "text",
    "twitter_handle" "text",
    "instagram_handle" "text",
    "status" "public"."school_status" DEFAULT 'researching'::"public"."school_status",
    "amenities" "jsonb",
    "pros" "text"[] DEFAULT ARRAY[]::"text"[],
    "cons" "text"[] DEFAULT ARRAY[]::"text"[],
    "notes" "text",
    "offer_details" "jsonb",
    "academic_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "updated_by" "uuid",
    "favicon_url" "text",
    "fit_tier" character varying(20),
    "status_changed_at" timestamp with time zone,
    "coaching_philosophy" "text",
    "coaching_style" "text",
    "recruiting_approach" "text",
    "communication_style" "text",
    "success_metrics" "text",
    "family_unit_id" "uuid",
    "city" "text",
    "state" "text",
    CONSTRAINT "schools_fit_tier_check" CHECK ((("fit_tier")::"text" = ANY ((ARRAY['reach'::character varying, 'match'::character varying, 'safety'::character varying, 'unlikely'::character varying])::"text"[])))
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


COMMENT ON TABLE "public"."schools" IS 'Schools table - status values migrated to new 9-value enum on 2026-01-25';



COMMENT ON COLUMN "public"."schools"."fit_tier" IS 'Tier classification: 70-100 match/safety, 50-69 reach, 0-49 unlikely';



COMMENT ON COLUMN "public"."schools"."status_changed_at" IS 'Timestamp of when the current status was set';



CREATE TABLE IF NOT EXISTS "public"."schools_backup_pre_family" (
    "id" "uuid",
    "user_id" "uuid",
    "name" "text",
    "location" "text",
    "division" "public"."school_division",
    "conference" "text",
    "ranking" integer,
    "is_favorite" boolean,
    "website" "text",
    "twitter_handle" "text",
    "instagram_handle" "text",
    "status" "public"."school_status",
    "amenities" "jsonb",
    "pros" "text"[],
    "cons" "text"[],
    "notes" "text",
    "private_notes" "jsonb",
    "offer_details" "jsonb",
    "academic_info" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "favicon_url" "text",
    "fit_score" integer,
    "fit_tier" character varying(20),
    "fit_score_data" "jsonb",
    "priority_tier" character varying(1),
    "status_changed_at" timestamp with time zone,
    "coaching_philosophy" "text",
    "coaching_style" "text",
    "recruiting_approach" "text",
    "communication_style" "text",
    "success_metrics" "text",
    "family_unit_id" "uuid"
);


ALTER TABLE "public"."schools_backup_pre_family" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_media_posts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "coach_id" "uuid",
    "school_id" "uuid" NOT NULL,
    "platform" "public"."social_platform" NOT NULL,
    "post_url" "text" NOT NULL,
    "post_content" "text",
    "post_date" timestamp with time zone,
    "is_recruiting_related" boolean DEFAULT false,
    "flagged_for_review" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "author_name" "text",
    "author_handle" "text",
    "engagement_count" integer DEFAULT 0,
    "sentiment" "text",
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_media_posts_sentiment_check" CHECK (("sentiment" = ANY (ARRAY['positive'::"text", 'neutral'::"text", 'negative'::"text", 'very_positive'::"text"])))
);


ALTER TABLE "public"."social_media_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "has_position_list" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports" OWNER TO "postgres";


COMMENT ON TABLE "public"."sports" IS 'Master list of sports available for player profiles';



COMMENT ON COLUMN "public"."sports"."name" IS 'Sport name (e.g., "Baseball", "Soccer")';



COMMENT ON COLUMN "public"."sports"."has_position_list" IS 'Whether sport uses standard position list (true) or free-text positions (false)';



COMMENT ON COLUMN "public"."sports"."display_order" IS 'Order for display in UI dropdowns (ascending)';



CREATE TABLE IF NOT EXISTS "public"."suggestion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "rule_type" character varying(50) NOT NULL,
    "urgency" character varying(10) NOT NULL,
    "message" "text" NOT NULL,
    "action_type" character varying(50),
    "related_school_id" "uuid",
    "related_task_id" "uuid",
    "dismissed" boolean DEFAULT false,
    "dismissed_at" timestamp with time zone,
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "pending_surface" boolean DEFAULT true,
    "surfaced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "condition_snapshot" "jsonb",
    "reappeared" boolean DEFAULT false,
    "previous_suggestion_id" "uuid",
    CONSTRAINT "suggestion_urgency_check" CHECK ((("urgency")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::"text"[])))
);


ALTER TABLE "public"."suggestion" OWNER TO "postgres";


COMMENT ON TABLE "public"."suggestion" IS 'Store suggestions generated by rule engine for surfacing to athletes';



CREATE TABLE IF NOT EXISTS "public"."system_calendar" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "sport" "text",
    "division" "text",
    "label" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "season_year" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "system_calendar_category_check" CHECK (("category" = ANY (ARRAY['signing_day'::"text", 'nli_period'::"text", 'contact_period'::"text", 'dead_period'::"text", 'quiet_period'::"text", 'evaluation_period'::"text", 'sat_date'::"text", 'act_date'::"text"]))),
    CONSTRAINT "system_calendar_division_check" CHECK ((("division" = ANY (ARRAY['d1'::"text", 'd2'::"text", 'd3'::"text"])) OR ("division" IS NULL)))
);


ALTER TABLE "public"."system_calendar" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" character varying(20) NOT NULL,
    "grade_level" integer NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "required" boolean DEFAULT false,
    "dependency_task_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "why_it_matters" "text",
    "failure_risk" "text",
    "division_applicability" character varying(10)[] DEFAULT ARRAY['ALL'::character varying],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['academic'::character varying, 'athletic'::character varying, 'recruiting'::character varying, 'exposure'::character varying, 'mindset'::character varying])::"text"[]))),
    CONSTRAINT "task_grade_level_check" CHECK ((("grade_level" >= 9) AND ("grade_level" <= 12)))
);


ALTER TABLE "public"."task" OWNER TO "postgres";


COMMENT ON TABLE "public"."task" IS 'Master list of recruiting timeline tasks across all grades (9-12) and categories';



CREATE TABLE IF NOT EXISTS "public"."user_deadlines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "school_id" "uuid",
    "label" "text" NOT NULL,
    "deadline_date" "date" NOT NULL,
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_deadlines_category_check" CHECK (("category" = ANY (ARRAY['application'::"text", 'decision'::"text", 'financial_aid'::"text", 'visit'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."user_deadlines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entity_type" character varying(20) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "note_content" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_notes_entity_type_check" CHECK ((("entity_type")::"text" = ANY ((ARRAY['school'::character varying, 'coach'::character varying, 'interaction'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_notes" IS 'Private notes per user for schools, coaches, interactions';



COMMENT ON COLUMN "public"."user_notes"."entity_type" IS 'Type of entity being noted: school, coach, interaction';



CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences_v1_backup" (
    "user_id" "uuid" NOT NULL,
    "notification_settings" "jsonb" DEFAULT '{"enableDailyDigest": true, "enableDeadlineAlerts": true, "followUpReminderDays": 7, "enableFollowUpReminders": true, "enableInboundInteractionAlerts": true}'::"jsonb",
    "communication_templates" "jsonb",
    "dashboard_layout" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "home_location" "jsonb",
    "player_details" "jsonb" DEFAULT '{}'::"jsonb",
    "school_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "preference_history" "jsonb" DEFAULT '[]'::"jsonb",
    "social_sync_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "user_tasks" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."user_preferences_v1_backup" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_preferences_v1_backup"."home_location" IS 'User home location for distance calculations. Structure: {address, city, state, zip, latitude, longitude}';



COMMENT ON COLUMN "public"."user_preferences_v1_backup"."social_sync_settings" IS 'Social media sync settings: autoSyncEnabled, notifyOnRecruitingPosts, notifyOnMentions, lastSyncTime';



COMMENT ON COLUMN "public"."user_preferences_v1_backup"."user_tasks" IS 'User task list for quick todos: { tasks: [{ id, text, completed, created_at, completed_at }] }';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "public"."user_role" NOT NULL,
    "phone" "text",
    "icloud_sync_enabled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "current_phase" character varying(20) DEFAULT 'freshman'::character varying,
    "phase_milestone_data" "jsonb" DEFAULT '{}'::"jsonb",
    "status_score" integer,
    "status_label" character varying(20),
    "recovery_mode_active" boolean DEFAULT false,
    "recovery_plan_shown_at" timestamp with time zone,
    "graduation_year" integer,
    "is_admin" boolean DEFAULT false,
    "is_preview_mode" boolean DEFAULT false NOT NULL,
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "primary_sport_id" "uuid",
    "primary_position_id" "uuid",
    "primary_position_custom" character varying(100),
    "secondary_sport_id" "uuid",
    "secondary_position_id" "uuid",
    "secondary_position_custom" character varying(100),
    "zip_code" character(5),
    "gpa" numeric(3,2),
    "sat_score" integer,
    "act_score" integer,
    "profile_completeness" integer DEFAULT 0,
    "profile_photo_url" "text",
    "date_of_birth" "date",
    "deletion_requested_at" timestamp with time zone,
    "timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL,
    CONSTRAINT "act_score_range_check" CHECK (((("act_score" >= 1) AND ("act_score" <= 36)) OR ("act_score" IS NULL))),
    CONSTRAINT "gpa_range_check" CHECK (((("gpa" >= 0.0) AND ("gpa" <= 5.0)) OR ("gpa" IS NULL))),
    CONSTRAINT "graduation_year_range" CHECK ((("graduation_year" IS NULL) OR (("graduation_year" >= 2024) AND ("graduation_year" <= 2040)))),
    CONSTRAINT "profile_completeness_range_check" CHECK ((("profile_completeness" >= 0) AND ("profile_completeness" <= 100))),
    CONSTRAINT "sat_score_range_check" CHECK (((("sat_score" >= 400) AND ("sat_score" <= 1600)) OR ("sat_score" IS NULL))),
    CONSTRAINT "users_current_phase_check" CHECK ((("current_phase")::"text" = ANY ((ARRAY['freshman'::character varying, 'sophomore'::character varying, 'junior'::character varying, 'senior'::character varying, 'committed'::character varying])::"text"[]))),
    CONSTRAINT "users_status_label_check" CHECK ((("status_label")::"text" = ANY ((ARRAY['on_track'::character varying, 'slightly_behind'::character varying, 'at_risk'::character varying])::"text"[]))),
    CONSTRAINT "users_status_score_check" CHECK ((("status_score" >= 0) AND ("status_score" <= 100))),
    CONSTRAINT "users_timezone_check" CHECK (("timezone" = ANY (ARRAY['America/New_York'::"text", 'America/Chicago'::"text", 'America/Denver'::"text", 'America/Los_Angeles'::"text"]))),
    CONSTRAINT "zip_code_format_check" CHECK ((("zip_code" ~ '^\d{5}$'::"text") OR ("zip_code" IS NULL)))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Central user table; athletes own player profiles; parents can link to multiple player profiles';



COMMENT ON COLUMN "public"."users"."current_phase" IS 'Current recruiting phase: freshman through committed';



COMMENT ON COLUMN "public"."users"."phase_milestone_data" IS 'JSONB tracking which phase milestones have been completed';



COMMENT ON COLUMN "public"."users"."status_score" IS 'Composite status score 0-100: 75+ on_track, 50-74 slightly_behind, 0-49 at_risk';



COMMENT ON COLUMN "public"."users"."status_label" IS 'Derived status label from score';



COMMENT ON COLUMN "public"."users"."recovery_mode_active" IS 'Flag indicating athlete is in recovery/catch-up mode';



COMMENT ON COLUMN "public"."users"."is_preview_mode" IS 'True if parent is viewing demo profile; false for real player profiles';



COMMENT ON COLUMN "public"."users"."onboarding_completed" IS 'True when player has completed all 5 onboarding screens; false until all screens completed';



COMMENT ON COLUMN "public"."users"."primary_sport_id" IS 'Foreign key to sports table for primary sport';



COMMENT ON COLUMN "public"."users"."primary_position_id" IS 'Foreign key to positions table for primary position (when sport has defined positions)';



COMMENT ON COLUMN "public"."users"."primary_position_custom" IS 'Free-text primary position (for sports without position list, e.g., track & field)';



COMMENT ON COLUMN "public"."users"."secondary_sport_id" IS 'Foreign key to sports table for secondary sport (optional)';



COMMENT ON COLUMN "public"."users"."secondary_position_id" IS 'Foreign key to positions table for secondary position (when sport has defined positions)';



COMMENT ON COLUMN "public"."users"."secondary_position_custom" IS 'Free-text secondary position (for sports without position list)';



COMMENT ON COLUMN "public"."users"."zip_code" IS '5-digit US zip code for distance calculations (format: 12345)';



COMMENT ON COLUMN "public"."users"."gpa" IS 'GPA on 4.0 or 5.0 scale (optional)';



COMMENT ON COLUMN "public"."users"."sat_score" IS 'SAT score 400-1600 (optional)';



COMMENT ON COLUMN "public"."users"."act_score" IS 'ACT score 1-36 (optional)';



COMMENT ON COLUMN "public"."users"."profile_completeness" IS 'Profile completion percentage 0-100; calculated from presence of key fields';



COMMENT ON COLUMN "public"."users"."profile_photo_url" IS 'Public URL to user
  profile photo stored in profile-photos bucket';



ALTER TABLE ONLY "public"."account_links"
    ADD CONSTRAINT "account_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_task"
    ADD CONSTRAINT "athlete_task_athlete_id_task_id_key" UNIQUE ("athlete_id", "task_id");



ALTER TABLE ONLY "public"."athlete_task"
    ADD CONSTRAINT "athlete_task_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coaches"
    ADD CONSTRAINT "coaches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_templates"
    ADD CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_ownership_snapshot"
    ADD CONSTRAINT "data_ownership_snapshot_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deadline_alert_log"
    ADD CONSTRAINT "deadline_alert_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deadline_alert_log"
    ADD CONSTRAINT "deadline_alert_log_user_id_source_table_source_id_alert_day_key" UNIQUE ("user_id", "source_table", "source_id", "alert_days_before");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_user_id_token_key" UNIQUE ("user_id", "token");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_code_usage_log"
    ADD CONSTRAINT "family_code_usage_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_invitations"
    ADD CONSTRAINT "family_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_invitations"
    ADD CONSTRAINT "family_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_family_unit_id_user_id_key" UNIQUE ("family_unit_id", "user_id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_units"
    ADD CONSTRAINT "family_units_family_code_key" UNIQUE ("family_code");



ALTER TABLE ONLY "public"."family_units"
    ADD CONSTRAINT "family_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follow_up_reminders"
    ADD CONSTRAINT "follow_up_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."help_feedback"
    ADD CONSTRAINT "help_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nces_schools"
    ADD CONSTRAINT "nces_schools_pkey" PRIMARY KEY ("nces_id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_notification_type_key" UNIQUE ("user_id", "notification_type");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_view_log"
    ADD CONSTRAINT "parent_view_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."performance_metrics"
    ADD CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_hash_slug_key" UNIQUE ("hash_slug");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_vanity_slug_key" UNIQUE ("vanity_slug");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_sport_id_name_key" UNIQUE ("sport_id", "name");



ALTER TABLE ONLY "public"."preference_history"
    ADD CONSTRAINT "preference_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_tracking_links"
    ADD CONSTRAINT "profile_tracking_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_tracking_links"
    ADD CONSTRAINT "profile_tracking_links_profile_id_coach_id_key" UNIQUE ("profile_id", "coach_id");



ALTER TABLE ONLY "public"."profile_tracking_links"
    ADD CONSTRAINT "profile_tracking_links_ref_token_key" UNIQUE ("ref_token");



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendation_letters"
    ADD CONSTRAINT "recommendation_letters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_status_history"
    ADD CONSTRAINT "school_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_media_posts"
    ADD CONSTRAINT "social_media_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suggestion"
    ADD CONSTRAINT "suggestion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_calendar"
    ADD CONSTRAINT "system_calendar_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_calendar"
    ADD CONSTRAINT "system_calendar_unique_label_start_season" UNIQUE ("label", "start_date", "season_year");



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_deadlines"
    ADD CONSTRAINT "user_deadlines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notes"
    ADD CONSTRAINT "user_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notes"
    ADD CONSTRAINT "user_notes_user_id_entity_type_entity_id_key" UNIQUE ("user_id", "entity_type", "entity_id");



ALTER TABLE ONLY "public"."user_preferences_v1_backup"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_category_key" UNIQUE ("user_id", "category");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_unique" UNIQUE ("email");



COMMENT ON CONSTRAINT "users_email_unique" ON "public"."users" IS 'Prevents duplicate user records for same email address. Ensures each user can only have one profile regardless of how many times initialization runs.';



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "deadline_alert_log_user_idx" ON "public"."deadline_alert_log" USING "btree" ("user_id", "source_table", "source_id");



CREATE INDEX "idx_account_links_email" ON "public"."account_links" USING "btree" ("invited_email");



CREATE INDEX "idx_account_links_initiator_user_id" ON "public"."account_links" USING "btree" ("initiator_user_id");



CREATE INDEX "idx_account_links_parent" ON "public"."account_links" USING "btree" ("parent_user_id");



CREATE INDEX "idx_account_links_player" ON "public"."account_links" USING "btree" ("player_user_id");



CREATE INDEX "idx_account_links_status" ON "public"."account_links" USING "btree" ("status");



CREATE INDEX "idx_account_links_token" ON "public"."account_links" USING "btree" ("invitation_token");



CREATE INDEX "idx_athlete_task_athlete" ON "public"."athlete_task" USING "btree" ("athlete_id");



CREATE INDEX "idx_athlete_task_completed" ON "public"."athlete_task" USING "btree" ("athlete_id", "completed_at" DESC);



CREATE INDEX "idx_athlete_task_recovery" ON "public"."athlete_task" USING "btree" ("athlete_id", "is_recovery_task") WHERE ("is_recovery_task" = true);



CREATE INDEX "idx_athlete_task_status" ON "public"."athlete_task" USING "btree" ("athlete_id", "status");



CREATE INDEX "idx_athlete_task_task_id" ON "public"."athlete_task" USING "btree" ("task_id");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "idx_audit_logs_expires_at" ON "public"."audit_logs" USING "btree" ("expires_at");



CREATE INDEX "idx_audit_logs_lookup" ON "public"."audit_logs" USING "btree" ("user_id", "resource_type", "resource_id", "action", "created_at" DESC);



CREATE INDEX "idx_audit_logs_resource" ON "public"."audit_logs" USING "btree" ("resource_type", "resource_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_status_created" ON "public"."audit_logs" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_audit_logs_user_created" ON "public"."audit_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_coaches_availability" ON "public"."coaches" USING "gin" ("availability");



CREATE INDEX "idx_coaches_created_by" ON "public"."coaches" USING "btree" ("created_by");



CREATE INDEX "idx_coaches_family_unit_id" ON "public"."coaches" USING "btree" ("family_unit_id");



CREATE INDEX "idx_coaches_name_tsvector" ON "public"."coaches" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("first_name" || ' '::"text") || "last_name")));



CREATE INDEX "idx_coaches_school_family_created" ON "public"."coaches" USING "btree" ("school_id", "family_unit_id", "created_at" DESC);



CREATE INDEX "idx_coaches_school_id" ON "public"."coaches" USING "btree" ("school_id");



CREATE INDEX "idx_coaches_updated_by" ON "public"."coaches" USING "btree" ("updated_by");



CREATE INDEX "idx_coaches_user_id" ON "public"."coaches" USING "btree" ("user_id");



CREATE INDEX "idx_communication_templates_is_predefined" ON "public"."communication_templates" USING "btree" ("is_predefined") WHERE ("is_predefined" = true);



CREATE INDEX "idx_communication_templates_user_id" ON "public"."communication_templates" USING "btree" ("user_id");



CREATE INDEX "idx_communication_templates_user_predefined" ON "public"."communication_templates" USING "btree" ("user_id", "is_predefined");



CREATE INDEX "idx_data_ownership_entity" ON "public"."data_ownership_snapshot" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_data_ownership_link" ON "public"."data_ownership_snapshot" USING "btree" ("link_id");



CREATE INDEX "idx_data_ownership_owner" ON "public"."data_ownership_snapshot" USING "btree" ("original_owner_id");



CREATE INDEX "idx_dismissed_reevaluation" ON "public"."suggestion" USING "btree" ("athlete_id", "rule_type", "dismissed", "dismissed_at") WHERE ("dismissed" = true);



CREATE INDEX "idx_documents_family_unit_id" ON "public"."documents" USING "btree" ("family_unit_id");



CREATE INDEX "idx_documents_health_status" ON "public"."documents" USING "btree" ("health_status") WHERE (("health_status")::"text" = ANY ((ARRAY['broken'::character varying, 'unknown'::character varying])::"text"[]));



CREATE INDEX "idx_documents_school_id" ON "public"."documents" USING "btree" ("school_id");



CREATE INDEX "idx_documents_school_type" ON "public"."documents" USING "btree" ("school_id", "type", "created_at" DESC);



CREATE INDEX "idx_documents_type" ON "public"."documents" USING "btree" ("type");



CREATE INDEX "idx_documents_uploaded_by" ON "public"."documents" USING "btree" ("uploaded_by");



CREATE INDEX "idx_documents_user_id" ON "public"."documents" USING "btree" ("user_id");



CREATE INDEX "idx_events_created_by" ON "public"."events" USING "btree" ("created_by");



CREATE INDEX "idx_events_family_unit_id" ON "public"."events" USING "btree" ("family_unit_id");



CREATE INDEX "idx_events_school_id" ON "public"."events" USING "btree" ("school_id");



CREATE INDEX "idx_events_school_type" ON "public"."events" USING "btree" ("school_id", "type");



CREATE INDEX "idx_events_school_user" ON "public"."events" USING "btree" ("school_id", "user_id");



CREATE INDEX "idx_events_start_date" ON "public"."events" USING "btree" ("start_date" DESC);



CREATE INDEX "idx_events_type" ON "public"."events" USING "btree" ("type");



CREATE INDEX "idx_events_updated_by" ON "public"."events" USING "btree" ("updated_by");



CREATE INDEX "idx_events_user_id" ON "public"."events" USING "btree" ("user_id");



CREATE INDEX "idx_events_user_school_type" ON "public"."events" USING "btree" ("user_id", "school_id", "type", "start_date");



CREATE INDEX "idx_family_code_usage_log_created_at" ON "public"."family_code_usage_log" USING "btree" ("created_at");



CREATE INDEX "idx_family_code_usage_log_family_unit" ON "public"."family_code_usage_log" USING "btree" ("family_unit_id");



CREATE INDEX "idx_family_code_usage_log_user" ON "public"."family_code_usage_log" USING "btree" ("user_id");



CREATE INDEX "idx_family_invitations_family" ON "public"."family_invitations" USING "btree" ("family_unit_id", "status");



CREATE INDEX "idx_family_invitations_token" ON "public"."family_invitations" USING "btree" ("token");



CREATE INDEX "idx_family_members_family_unit_id" ON "public"."family_members" USING "btree" ("family_unit_id");



CREATE INDEX "idx_family_members_user_id" ON "public"."family_members" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_family_units_code" ON "public"."family_units" USING "btree" ("family_code") WHERE ("family_code" IS NOT NULL);



CREATE INDEX "idx_follow_up_reminders_coach_id" ON "public"."follow_up_reminders" USING "btree" ("coach_id");



CREATE INDEX "idx_follow_up_reminders_due_date" ON "public"."follow_up_reminders" USING "btree" ("due_date");



CREATE INDEX "idx_follow_up_reminders_interaction_id" ON "public"."follow_up_reminders" USING "btree" ("interaction_id");



CREATE INDEX "idx_follow_up_reminders_is_completed" ON "public"."follow_up_reminders" USING "btree" ("is_completed");



CREATE INDEX "idx_follow_up_reminders_school_id" ON "public"."follow_up_reminders" USING "btree" ("school_id");



CREATE INDEX "idx_follow_up_reminders_user_due" ON "public"."follow_up_reminders" USING "btree" ("user_id", "due_date", "is_completed");



CREATE INDEX "idx_follow_up_reminders_user_id" ON "public"."follow_up_reminders" USING "btree" ("user_id");



CREATE INDEX "idx_interactions_coach_id" ON "public"."interactions" USING "btree" ("coach_id");



CREATE INDEX "idx_interactions_direction" ON "public"."interactions" USING "btree" ("direction");



CREATE INDEX "idx_interactions_event_id" ON "public"."interactions" USING "btree" ("event_id");



CREATE INDEX "idx_interactions_family_occurred" ON "public"."interactions" USING "btree" ("family_unit_id", "occurred_at" DESC);



CREATE INDEX "idx_interactions_family_unit_id" ON "public"."interactions" USING "btree" ("family_unit_id");



CREATE INDEX "idx_interactions_logged_by" ON "public"."interactions" USING "btree" ("logged_by");



CREATE INDEX "idx_interactions_occurred_at" ON "public"."interactions" USING "btree" ("occurred_at" DESC);



CREATE INDEX "idx_interactions_school_coach" ON "public"."interactions" USING "btree" ("school_id", "coach_id");



CREATE INDEX "idx_interactions_school_coach_type" ON "public"."interactions" USING "btree" ("school_id", "coach_id", "type", "occurred_at" DESC);



CREATE INDEX "idx_interactions_school_id" ON "public"."interactions" USING "btree" ("school_id");



CREATE INDEX "idx_interactions_school_occurred" ON "public"."interactions" USING "btree" ("school_id", "occurred_at" DESC);



CREATE INDEX "idx_interactions_school_type" ON "public"."interactions" USING "btree" ("school_id", "type");



CREATE INDEX "idx_interactions_sentiment" ON "public"."interactions" USING "btree" ("sentiment");



CREATE INDEX "idx_interactions_sentiment_occurred" ON "public"."interactions" USING "btree" ("sentiment", "occurred_at" DESC);



CREATE INDEX "idx_interactions_type" ON "public"."interactions" USING "btree" ("type");



CREATE INDEX "idx_interactions_updated_by" ON "public"."interactions" USING "btree" ("updated_by");



CREATE INDEX "idx_notifications_priority" ON "public"."notifications" USING "btree" ("priority");



CREATE INDEX "idx_notifications_scheduled_for" ON "public"."notifications" USING "btree" ("scheduled_for");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read_at" ON "public"."notifications" USING "btree" ("user_id", "read_at" NULLS FIRST, "scheduled_for" DESC);



CREATE INDEX "idx_offers_coach_id" ON "public"."offers" USING "btree" ("coach_id");



CREATE INDEX "idx_offers_family_unit_id" ON "public"."offers" USING "btree" ("family_unit_id");



CREATE INDEX "idx_offers_school_id" ON "public"."offers" USING "btree" ("school_id");



CREATE INDEX "idx_offers_user_id" ON "public"."offers" USING "btree" ("user_id");



CREATE INDEX "idx_parent_view_athlete" ON "public"."parent_view_log" USING "btree" ("athlete_id", "viewed_at" DESC);



CREATE INDEX "idx_parent_view_parent" ON "public"."parent_view_log" USING "btree" ("parent_user_id", "viewed_at" DESC);



CREATE INDEX "idx_performance_metrics_event_id" ON "public"."performance_metrics" USING "btree" ("event_id");



CREATE INDEX "idx_performance_metrics_family_unit_id" ON "public"."performance_metrics" USING "btree" ("family_unit_id");



CREATE INDEX "idx_performance_metrics_recorded_date" ON "public"."performance_metrics" USING "btree" ("recorded_date" DESC);



CREATE INDEX "idx_performance_metrics_user_id" ON "public"."performance_metrics" USING "btree" ("user_id");



CREATE INDEX "idx_performance_metrics_user_recorded" ON "public"."performance_metrics" USING "btree" ("user_id", "recorded_date" DESC);



CREATE UNIQUE INDEX "idx_player_one_family" ON "public"."family_members" USING "btree" ("user_id") WHERE (("role")::"text" = 'player'::"text");



CREATE INDEX "idx_positions_display_order" ON "public"."positions" USING "btree" ("sport_id", "display_order");



CREATE INDEX "idx_positions_sport_id" ON "public"."positions" USING "btree" ("sport_id");



CREATE INDEX "idx_preference_history_category" ON "public"."preference_history" USING "btree" ("category");



CREATE INDEX "idx_preference_history_created_at" ON "public"."preference_history" USING "btree" ("created_at");



CREATE INDEX "idx_preference_history_user_id" ON "public"."preference_history" USING "btree" ("user_id");



CREATE INDEX "idx_profile_tracking_links_profile" ON "public"."profile_tracking_links" USING "btree" ("profile_id");



CREATE INDEX "idx_profile_views_profile" ON "public"."profile_views" USING "btree" ("profile_id");



CREATE INDEX "idx_profile_views_tracking_link" ON "public"."profile_views" USING "btree" ("tracking_link_id");



CREATE INDEX "idx_reappeared_suggestions" ON "public"."suggestion" USING "btree" ("athlete_id", "reappeared") WHERE ("reappeared" = true);



CREATE INDEX "idx_recommendation_letters_document_id" ON "public"."recommendation_letters" USING "btree" ("document_id");



CREATE INDEX "idx_recommendation_letters_user_id" ON "public"."recommendation_letters" USING "btree" ("user_id");



CREATE INDEX "idx_school_status_history_changed_at" ON "public"."school_status_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_school_status_history_changed_by" ON "public"."school_status_history" USING "btree" ("changed_by");



CREATE INDEX "idx_school_status_history_new_status" ON "public"."school_status_history" USING "btree" ("new_status");



CREATE INDEX "idx_school_status_history_school_id" ON "public"."school_status_history" USING "btree" ("school_id");



CREATE INDEX "idx_schools_created_by" ON "public"."schools" USING "btree" ("created_by");



CREATE INDEX "idx_schools_family_unit_id" ON "public"."schools" USING "btree" ("family_unit_id");



CREATE INDEX "idx_schools_fit_tier" ON "public"."schools" USING "btree" ("fit_tier");



CREATE INDEX "idx_schools_is_favorite" ON "public"."schools" USING "btree" ("is_favorite");



CREATE INDEX "idx_schools_name_tsvector" ON "public"."schools" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("name" || ' '::"text") || COALESCE("location", ''::"text"))));



CREATE INDEX "idx_schools_status" ON "public"."schools" USING "btree" ("status");



CREATE INDEX "idx_schools_updated_by" ON "public"."schools" USING "btree" ("updated_by");



CREATE INDEX "idx_schools_user_id" ON "public"."schools" USING "btree" ("user_id");



CREATE INDEX "idx_schools_user_id_status" ON "public"."schools" USING "btree" ("user_id", "status");



CREATE INDEX "idx_social_posts_coach" ON "public"."social_media_posts" USING "btree" ("coach_id");



CREATE INDEX "idx_social_posts_date" ON "public"."social_media_posts" USING "btree" ("post_date" DESC);



CREATE INDEX "idx_social_posts_flagged" ON "public"."social_media_posts" USING "btree" ("flagged_for_review");



CREATE INDEX "idx_social_posts_platform" ON "public"."social_media_posts" USING "btree" ("platform");



CREATE INDEX "idx_social_posts_school" ON "public"."social_media_posts" USING "btree" ("school_id");



CREATE INDEX "idx_social_posts_url" ON "public"."social_media_posts" USING "btree" ("post_url");



CREATE INDEX "idx_sports_display_order" ON "public"."sports" USING "btree" ("display_order");



CREATE INDEX "idx_sports_has_position_list" ON "public"."sports" USING "btree" ("has_position_list");



CREATE INDEX "idx_suggestion_athlete_active" ON "public"."suggestion" USING "btree" ("athlete_id", "dismissed", "completed") WHERE (("dismissed" = false) AND ("completed" = false));



CREATE INDEX "idx_suggestion_athlete_filter" ON "public"."suggestion" USING "btree" ("athlete_id", "pending_surface", "dismissed", "completed", "urgency" DESC, "surfaced_at" DESC);



CREATE INDEX "idx_suggestion_athlete_surfaced" ON "public"."suggestion" USING "btree" ("athlete_id", "surfaced_at" DESC);



CREATE INDEX "idx_suggestion_pending" ON "public"."suggestion" USING "btree" ("pending_surface", "created_at") WHERE ("pending_surface" = true);



CREATE INDEX "idx_suggestion_related_school_id" ON "public"."suggestion" USING "btree" ("related_school_id");



CREATE INDEX "idx_suggestion_related_task_id" ON "public"."suggestion" USING "btree" ("related_task_id");



CREATE INDEX "idx_suggestion_urgency" ON "public"."suggestion" USING "btree" ("athlete_id", "urgency") WHERE (("dismissed" = false) AND ("completed" = false));



CREATE INDEX "idx_system_calendar_category" ON "public"."system_calendar" USING "btree" ("category");



CREATE INDEX "idx_system_calendar_season_year" ON "public"."system_calendar" USING "btree" ("season_year");



CREATE INDEX "idx_system_calendar_start_date" ON "public"."system_calendar" USING "btree" ("start_date");



CREATE INDEX "idx_task_category" ON "public"."task" USING "btree" ("category");



CREATE INDEX "idx_task_grade_category" ON "public"."task" USING "btree" ("grade_level", "category");



CREATE INDEX "idx_task_grade_level" ON "public"."task" USING "btree" ("grade_level");



CREATE INDEX "idx_user_deadlines_category" ON "public"."user_deadlines" USING "btree" ("category");



CREATE INDEX "idx_user_deadlines_deadline_date" ON "public"."user_deadlines" USING "btree" ("deadline_date");



CREATE INDEX "idx_user_deadlines_user_id" ON "public"."user_deadlines" USING "btree" ("user_id");



CREATE INDEX "idx_user_notes_entity" ON "public"."user_notes" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_user_notes_user_id" ON "public"."user_notes" USING "btree" ("user_id");



CREATE INDEX "idx_user_preferences_category" ON "public"."user_preferences" USING "btree" ("category");



CREATE INDEX "idx_user_preferences_updated_at" ON "public"."user_preferences" USING "btree" ("updated_at");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_users_academic_profile" ON "public"."users" USING "btree" ("gpa", "sat_score", "act_score") WHERE (("gpa" IS NOT NULL) OR ("sat_score" IS NOT NULL) OR ("act_score" IS NOT NULL));



CREATE INDEX "idx_users_act_score" ON "public"."users" USING "btree" ("act_score");



CREATE INDEX "idx_users_current_phase" ON "public"."users" USING "btree" ("current_phase");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_gpa" ON "public"."users" USING "btree" ("gpa");



CREATE INDEX "idx_users_graduation_year" ON "public"."users" USING "btree" ("graduation_year");



CREATE INDEX "idx_users_is_preview_mode" ON "public"."users" USING "btree" ("is_preview_mode") WHERE ("is_preview_mode" = true);



CREATE INDEX "idx_users_onboarding_completed" ON "public"."users" USING "btree" ("onboarding_completed") WHERE ("onboarding_completed" = false);



CREATE INDEX "idx_users_primary_sport" ON "public"."users" USING "btree" ("primary_sport_id") WHERE ("primary_sport_id" IS NOT NULL);



CREATE INDEX "idx_users_profile_completeness" ON "public"."users" USING "btree" ("profile_completeness");



CREATE INDEX "idx_users_profile_photo_url" ON "public"."users" USING "btree" ("profile_photo_url") WHERE ("profile_photo_url" IS NOT NULL);



CREATE INDEX "idx_users_recovery_mode" ON "public"."users" USING "btree" ("recovery_mode_active") WHERE ("recovery_mode_active" = true);



CREATE INDEX "idx_users_sat_score" ON "public"."users" USING "btree" ("sat_score");



CREATE INDEX "idx_users_status_label" ON "public"."users" USING "btree" ("status_label");



CREATE INDEX "idx_users_zip_code" ON "public"."users" USING "btree" ("zip_code");



CREATE INDEX "nces_schools_name_trgm" ON "public"."nces_schools" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "nces_schools_state_idx" ON "public"."nces_schools" USING "btree" ("state");



CREATE UNIQUE INDEX "system_calendar_label_date_year_idx" ON "public"."system_calendar" USING "btree" ("label", "start_date", "season_year");



CREATE INDEX "user_deadlines_user_date_idx" ON "public"."user_deadlines" USING "btree" ("user_id", "deadline_date");



CREATE OR REPLACE TRIGGER "player_profiles_updated_at" BEFORE UPDATE ON "public"."player_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_player_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "push_on_notification_insert" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_push_notification"();



CREATE OR REPLACE TRIGGER "update_coaches_updated_at" BEFORE UPDATE ON "public"."coaches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_follow_up_reminders_updated_at_trigger" BEFORE UPDATE ON "public"."follow_up_reminders" FOR EACH ROW EXECUTE FUNCTION "public"."update_follow_up_reminders_updated_at"();



CREATE OR REPLACE TRIGGER "update_interactions_updated_at" BEFORE UPDATE ON "public"."interactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recommendation_letters_updated_at" BEFORE UPDATE ON "public"."recommendation_letters" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_schools_updated_at" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_social_posts_timestamp_trigger" BEFORE UPDATE ON "public"."social_media_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_social_posts_timestamp"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences_v1_backup" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at_trigger" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_document_schools_insert" BEFORE INSERT ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."validate_document_schools"();



CREATE OR REPLACE TRIGGER "validate_document_schools_update" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."validate_document_schools"();



CREATE OR REPLACE TRIGGER "validate_event_coaches_insert" BEFORE INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_coaches"();



CREATE OR REPLACE TRIGGER "validate_event_coaches_update" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_coaches"();



CREATE OR REPLACE TRIGGER "validate_rec_letter_schools_insert" BEFORE INSERT ON "public"."recommendation_letters" FOR EACH ROW EXECUTE FUNCTION "public"."validate_rec_letter_schools"();



CREATE OR REPLACE TRIGGER "validate_rec_letter_schools_update" BEFORE UPDATE ON "public"."recommendation_letters" FOR EACH ROW EXECUTE FUNCTION "public"."validate_rec_letter_schools"();



ALTER TABLE ONLY "public"."account_links"
    ADD CONSTRAINT "account_links_initiator_user_id_fkey" FOREIGN KEY ("initiator_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."account_links"
    ADD CONSTRAINT "account_links_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."account_links"
    ADD CONSTRAINT "account_links_player_user_id_fkey" FOREIGN KEY ("player_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_task"
    ADD CONSTRAINT "athlete_task_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_task"
    ADD CONSTRAINT "athlete_task_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coaches"
    ADD CONSTRAINT "coaches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."coaches"
    ADD CONSTRAINT "coaches_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coaches"
    ADD CONSTRAINT "coaches_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coaches"
    ADD CONSTRAINT "coaches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."coaches"
    ADD CONSTRAINT "coaches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_templates"
    ADD CONSTRAINT "communication_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_ownership_snapshot"
    ADD CONSTRAINT "data_ownership_snapshot_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "public"."account_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_ownership_snapshot"
    ADD CONSTRAINT "data_ownership_snapshot_original_owner_id_fkey" FOREIGN KEY ("original_owner_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."deadline_alert_log"
    ADD CONSTRAINT "deadline_alert_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_code_usage_log"
    ADD CONSTRAINT "family_code_usage_log_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_code_usage_log"
    ADD CONSTRAINT "family_code_usage_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_invitations"
    ADD CONSTRAINT "family_invitations_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_invitations"
    ADD CONSTRAINT "family_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_units"
    ADD CONSTRAINT "family_units_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "fk_interactions_event_id" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."follow_up_reminders"
    ADD CONSTRAINT "follow_up_reminders_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."follow_up_reminders"
    ADD CONSTRAINT "follow_up_reminders_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follow_up_reminders"
    ADD CONSTRAINT "follow_up_reminders_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follow_up_reminders"
    ADD CONSTRAINT "follow_up_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."help_feedback"
    ADD CONSTRAINT "help_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_view_log"
    ADD CONSTRAINT "parent_view_log_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_view_log"
    ADD CONSTRAINT "parent_view_log_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."performance_metrics"
    ADD CONSTRAINT "performance_metrics_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."performance_metrics"
    ADD CONSTRAINT "performance_metrics_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."performance_metrics"
    ADD CONSTRAINT "performance_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preference_history"
    ADD CONSTRAINT "preference_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_tracking_links"
    ADD CONSTRAINT "profile_tracking_links_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_tracking_links"
    ADD CONSTRAINT "profile_tracking_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."player_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."player_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_tracking_link_id_fkey" FOREIGN KEY ("tracking_link_id") REFERENCES "public"."profile_tracking_links"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recommendation_letters"
    ADD CONSTRAINT "recommendation_letters_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recommendation_letters"
    ADD CONSTRAINT "recommendation_letters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_status_history"
    ADD CONSTRAINT "school_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."school_status_history"
    ADD CONSTRAINT "school_status_history_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_family_unit_id_fkey" FOREIGN KEY ("family_unit_id") REFERENCES "public"."family_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_media_posts"
    ADD CONSTRAINT "social_media_posts_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."social_media_posts"
    ADD CONSTRAINT "social_media_posts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suggestion"
    ADD CONSTRAINT "suggestion_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suggestion"
    ADD CONSTRAINT "suggestion_previous_suggestion_id_fkey" FOREIGN KEY ("previous_suggestion_id") REFERENCES "public"."suggestion"("id");



ALTER TABLE ONLY "public"."suggestion"
    ADD CONSTRAINT "suggestion_related_school_id_fkey" FOREIGN KEY ("related_school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."suggestion"
    ADD CONSTRAINT "suggestion_related_task_id_fkey" FOREIGN KEY ("related_task_id") REFERENCES "public"."task"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_deadlines"
    ADD CONSTRAINT "user_deadlines_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_deadlines"
    ADD CONSTRAINT "user_deadlines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_notes"
    ADD CONSTRAINT "user_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences_v1_backup"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_primary_position_id_fkey" FOREIGN KEY ("primary_position_id") REFERENCES "public"."positions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_primary_sport_id_fkey" FOREIGN KEY ("primary_sport_id") REFERENCES "public"."sports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_secondary_position_id_fkey" FOREIGN KEY ("secondary_position_id") REFERENCES "public"."positions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_secondary_sport_id_fkey" FOREIGN KEY ("secondary_sport_id") REFERENCES "public"."sports"("id") ON DELETE SET NULL;



CREATE POLICY "Athletes can create own task records" ON "public"."athlete_task" FOR INSERT WITH CHECK ((("athlete_id" = "auth"."uid"()) AND "public"."is_data_owner"("athlete_id")));



CREATE POLICY "Athletes can delete own suggestions" ON "public"."suggestion" FOR DELETE USING (("athlete_id" = "auth"."uid"()));



CREATE POLICY "Athletes can delete own task records" ON "public"."athlete_task" FOR DELETE USING ((("athlete_id" = "auth"."uid"()) AND "public"."is_data_owner"("athlete_id")));



CREATE POLICY "Athletes can update own suggestions" ON "public"."suggestion" FOR UPDATE USING (("athlete_id" = "auth"."uid"()));



CREATE POLICY "Athletes can update own task status" ON "public"."athlete_task" FOR UPDATE USING ((("athlete_id" = "auth"."uid"()) AND "public"."is_data_owner"("athlete_id")));



CREATE POLICY "Athletes can view logs about them" ON "public"."parent_view_log" FOR SELECT USING (("athlete_id" = "auth"."uid"()));



CREATE POLICY "Athletes can view own suggestions" ON "public"."suggestion" FOR SELECT USING (("athlete_id" = "auth"."uid"()));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."family_members" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Family members can view interactions in their families" ON "public"."interactions" FOR SELECT USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Family members can view offers in their families" ON "public"."offers" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Family members can view schools in their families" ON "public"."schools" FOR SELECT USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Family members can view their family units" ON "public"."family_units" FOR SELECT USING (("id" IN ( SELECT DISTINCT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Linked users can create coaches" ON "public"."coaches" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Linked users can create schools" ON "public"."schools" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Linked users can delete coaches" ON "public"."coaches" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT
        CASE
            WHEN ("account_links"."parent_user_id" = "auth"."uid"()) THEN "account_links"."player_user_id"
            WHEN ("account_links"."player_user_id" = "auth"."uid"()) THEN "account_links"."parent_user_id"
            ELSE NULL::"uuid"
        END AS "case"
   FROM "public"."account_links"
  WHERE (("account_links"."status" = 'accepted'::"text") AND (("account_links"."parent_user_id" = "auth"."uid"()) OR ("account_links"."player_user_id" = "auth"."uid"())))))));



CREATE POLICY "Linked users can delete schools" ON "public"."schools" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT
        CASE
            WHEN ("account_links"."parent_user_id" = "auth"."uid"()) THEN "account_links"."player_user_id"
            WHEN ("account_links"."player_user_id" = "auth"."uid"()) THEN "account_links"."parent_user_id"
            ELSE NULL::"uuid"
        END AS "case"
   FROM "public"."account_links"
  WHERE (("account_links"."status" = 'accepted'::"text") AND (("account_links"."parent_user_id" = "auth"."uid"()) OR ("account_links"."player_user_id" = "auth"."uid"())))))));



CREATE POLICY "Linked users can read coaches" ON "public"."coaches" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT
        CASE
            WHEN ("account_links"."parent_user_id" = "auth"."uid"()) THEN "account_links"."player_user_id"
            WHEN ("account_links"."player_user_id" = "auth"."uid"()) THEN "account_links"."parent_user_id"
            ELSE NULL::"uuid"
        END AS "case"
   FROM "public"."account_links"
  WHERE (("account_links"."status" = 'accepted'::"text") AND (("account_links"."parent_user_id" = "auth"."uid"()) OR ("account_links"."player_user_id" = "auth"."uid"())))))));



CREATE POLICY "Linked users can read schools" ON "public"."schools" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT
        CASE
            WHEN ("account_links"."parent_user_id" = "auth"."uid"()) THEN "account_links"."player_user_id"
            WHEN ("account_links"."player_user_id" = "auth"."uid"()) THEN "account_links"."parent_user_id"
            ELSE NULL::"uuid"
        END AS "case"
   FROM "public"."account_links"
  WHERE (("account_links"."status" = 'accepted'::"text") AND (("account_links"."parent_user_id" = "auth"."uid"()) OR ("account_links"."player_user_id" = "auth"."uid"())))))));



CREATE POLICY "Linked users can update coaches" ON "public"."coaches" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT
        CASE
            WHEN ("account_links"."parent_user_id" = "auth"."uid"()) THEN "account_links"."player_user_id"
            WHEN ("account_links"."player_user_id" = "auth"."uid"()) THEN "account_links"."parent_user_id"
            ELSE NULL::"uuid"
        END AS "case"
   FROM "public"."account_links"
  WHERE (("account_links"."status" = 'accepted'::"text") AND (("account_links"."parent_user_id" = "auth"."uid"()) OR ("account_links"."player_user_id" = "auth"."uid"()))))))) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Linked users can update schools" ON "public"."schools" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT
        CASE
            WHEN ("account_links"."parent_user_id" = "auth"."uid"()) THEN "account_links"."player_user_id"
            WHEN ("account_links"."player_user_id" = "auth"."uid"()) THEN "account_links"."parent_user_id"
            ELSE NULL::"uuid"
        END AS "case"
   FROM "public"."account_links"
  WHERE (("account_links"."status" = 'accepted'::"text") AND (("account_links"."parent_user_id" = "auth"."uid"()) OR ("account_links"."player_user_id" = "auth"."uid"()))))))) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Only players can create interactions" ON "public"."interactions" FOR INSERT WITH CHECK ((("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))) AND ("logged_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."family_members"
  WHERE (("family_members"."user_id" = "auth"."uid"()) AND (("family_members"."role")::"text" = 'player'::"text"))))));



CREATE POLICY "Parents can create view logs" ON "public"."parent_view_log" FOR INSERT WITH CHECK (("parent_user_id" = "auth"."uid"()));



CREATE POLICY "Parents can view family member suggestions" ON "public"."suggestion" FOR SELECT USING (("athlete_id" IN ( SELECT "fm2"."user_id"
   FROM ("public"."family_members" "fm1"
     JOIN "public"."family_members" "fm2" ON (("fm1"."family_unit_id" = "fm2"."family_unit_id")))
  WHERE (("fm1"."user_id" = "auth"."uid"()) AND ("fm2"."user_id" <> "auth"."uid"())))));



CREATE POLICY "Parents can view their own logs" ON "public"."parent_view_log" FOR SELECT USING (("parent_user_id" = "auth"."uid"()));



CREATE POLICY "Public can read positions" ON "public"."positions" FOR SELECT USING (true);



CREATE POLICY "Public can read sports" ON "public"."sports" FOR SELECT USING (true);



CREATE POLICY "Restrict ownership snapshot access" ON "public"."data_ownership_snapshot" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."account_links"
  WHERE (("account_links"."id" = "data_ownership_snapshot"."link_id") AND (("account_links"."parent_user_id" = "auth"."uid"()) OR ("account_links"."player_user_id" = "auth"."uid"()))))));



CREATE POLICY "Service role can insert suggestions" ON "public"."suggestion" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can read all help feedback" ON "public"."help_feedback" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Tasks are viewable by all authenticated users" ON "public"."task" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Tasks are viewable by all authenticated users" ON "public"."task" IS 'All authenticated users can read task master list';



CREATE POLICY "Users can add themselves to families they own" ON "public"."family_members" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."family_units" "fu"
  WHERE (("fu"."id" = "family_members"."family_unit_id") AND ("fu"."created_by_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create coaches in their families" ON "public"."coaches" FOR INSERT WITH CHECK (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create documents in their families" ON "public"."documents" FOR INSERT WITH CHECK (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create events in their families" ON "public"."events" FOR INSERT WITH CHECK (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create invitations" ON "public"."account_links" FOR INSERT WITH CHECK ((("auth"."uid"() = "initiator_user_id") AND (("auth"."uid"() = "parent_user_id") OR ("auth"."uid"() = "player_user_id"))));



CREATE POLICY "Users can create own coaches" ON "public"."coaches" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create performance metrics in their families" ON "public"."performance_metrics" FOR INSERT WITH CHECK (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create schools in their families" ON "public"."schools" FOR INSERT WITH CHECK (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create their own family unit" ON "public"."family_units" FOR INSERT WITH CHECK (("created_by_user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete coaches at their schools" ON "public"."coaches" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "coaches"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete coaches for own and linked schools" ON "public"."coaches" FOR DELETE USING (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))))));



CREATE POLICY "Users can delete events for own schools" ON "public"."events" FOR DELETE USING ((("school_id" IS NULL) OR ("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete offers in their families" ON "public"."offers" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR ("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own and linked coaches" ON "public"."coaches" FOR DELETE USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can delete own and linked documents" ON "public"."documents" FOR DELETE USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can delete own and linked performance metrics" ON "public"."performance_metrics" FOR DELETE USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can delete own and linked recommendation letters" ON "public"."recommendation_letters" FOR DELETE USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can delete own and linked schools" ON "public"."schools" FOR DELETE USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can delete own coaches" ON "public"."coaches" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own documents" ON "public"."documents" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own events" ON "public"."events" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own interactions" ON "public"."interactions" FOR DELETE USING (("logged_by" = "auth"."uid"()));



CREATE POLICY "Users can delete own links" ON "public"."account_links" FOR DELETE USING ((("auth"."uid"() = "parent_user_id") OR ("auth"."uid"() = "player_user_id")));



CREATE POLICY "Users can delete own notes" ON "public"."user_notes" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own performance metrics" ON "public"."performance_metrics" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own preferences" ON "public"."user_preferences_v1_backup" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own profile" ON "public"."users" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can delete own schools" ON "public"."schools" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete posts for linked schools" ON "public"."social_media_posts" FOR DELETE USING (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))))));



CREATE POLICY "Users can delete their own events" ON "public"."events" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own interactions" ON "public"."interactions" FOR DELETE USING ((("logged_by" = "auth"."uid"()) AND ("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id")))))));



COMMENT ON POLICY "Users can delete their own interactions" ON "public"."interactions" IS 'Allows users to delete interactions they created (logged_by = auth.uid()).';



CREATE POLICY "Users can delete their own preferences" ON "public"."user_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own reminders" ON "public"."follow_up_reminders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert coaches at their schools" ON "public"."coaches" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "coaches"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert coaches for own and linked schools" ON "public"."coaches" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))))));



CREATE POLICY "Users can insert documents" ON "public"."documents" FOR INSERT WITH CHECK (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can insert events for own schools" ON "public"."events" FOR INSERT WITH CHECK ((("school_id" IS NULL) OR ("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert interactions" ON "public"."interactions" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))))));



COMMENT ON POLICY "Users can insert interactions" ON "public"."interactions" IS 'Allows authenticated users to create interactions for accessible schools.';



CREATE POLICY "Users can insert offers in their families" ON "public"."offers" FOR INSERT WITH CHECK (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own documents" ON "public"."documents" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own notes" ON "public"."user_notes" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own performance metrics" ON "public"."performance_metrics" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences_v1_backup" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own recommendation letters" ON "public"."recommendation_letters" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert performance metrics" ON "public"."performance_metrics" FOR INSERT WITH CHECK (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can insert posts for own and linked schools" ON "public"."social_media_posts" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))))));



CREATE POLICY "Users can insert posts for own schools" ON "public"."social_media_posts" FOR INSERT WITH CHECK ((("school_id" IS NULL) OR ("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert recommendation letters" ON "public"."recommendation_letters" FOR INSERT WITH CHECK (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can insert schools" ON "public"."schools" FOR INSERT WITH CHECK (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can insert status history for their family schools" ON "public"."school_status_history" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."schools" "s"
     JOIN "public"."family_members" "fm" ON ((("fm"."family_unit_id" = "s"."family_unit_id") AND ("fm"."user_id" = "auth"."uid"()))))
  WHERE ("s"."id" = "school_status_history"."school_id"))));



CREATE POLICY "Users can insert their own events" ON "public"."events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own reminders" ON "public"."follow_up_reminders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own templates" ON "public"."communication_templates" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own and linked coaches" ON "public"."coaches" FOR SELECT USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can submit help feedback" ON "public"."help_feedback" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update coaches at their schools" ON "public"."coaches" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "coaches"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update coaches for own and linked schools" ON "public"."coaches" FOR UPDATE USING (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))))));



CREATE POLICY "Users can update coaches in their families" ON "public"."coaches" FOR UPDATE USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update documents in their families" ON "public"."documents" FOR UPDATE USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update events for own schools" ON "public"."events" FOR UPDATE USING ((("school_id" IS NULL) OR ("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update events in their families" ON "public"."events" FOR UPDATE USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update offers in their families" ON "public"."offers" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR ("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own and linked coaches" ON "public"."coaches" FOR UPDATE USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id")))) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own and linked documents" ON "public"."documents" FOR UPDATE USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can update own and linked performance metrics" ON "public"."performance_metrics" FOR UPDATE USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can update own and linked recommendation letters" ON "public"."recommendation_letters" FOR UPDATE USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can update own and linked schools" ON "public"."schools" FOR UPDATE USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can update own interactions" ON "public"."interactions" FOR UPDATE USING (("logged_by" = "auth"."uid"()));



CREATE POLICY "Users can update own links" ON "public"."account_links" FOR UPDATE USING ((("auth"."uid"() = "parent_user_id") OR ("auth"."uid"() = "player_user_id")));



CREATE POLICY "Users can update own notes" ON "public"."user_notes" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own preferences" ON "public"."user_preferences_v1_backup" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own suggestions" ON "public"."suggestion" FOR UPDATE USING (("athlete_id" = "auth"."uid"()));



CREATE POLICY "Users can update performance metrics in their families" ON "public"."performance_metrics" FOR UPDATE USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update posts for linked schools" ON "public"."social_media_posts" FOR UPDATE USING (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))))));



CREATE POLICY "Users can update posts for their schools and coaches" ON "public"."social_media_posts" FOR UPDATE USING ((("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"()))) OR ("coach_id" IN ( SELECT "c"."id"
   FROM ("public"."coaches" "c"
     JOIN "public"."schools" "s" ON (("c"."school_id" = "s"."id")))
  WHERE ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"()))) OR ("coach_id" IN ( SELECT "c"."id"
   FROM ("public"."coaches" "c"
     JOIN "public"."schools" "s" ON (("c"."school_id" = "s"."id")))
  WHERE ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update schools in their families" ON "public"."schools" FOR UPDATE USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own events" ON "public"."events" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own interactions" ON "public"."interactions" FOR UPDATE USING ((("logged_by" = "auth"."uid"()) AND ("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id")))))));



COMMENT ON POLICY "Users can update their own interactions" ON "public"."interactions" IS 'Allows users to update interactions they created (logged_by = auth.uid()).';



CREATE POLICY "Users can update their own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own reminders" ON "public"."follow_up_reminders" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all members in their families" ON "public"."family_members" FOR SELECT USING ("public"."user_is_family_member"("family_unit_id"));



CREATE POLICY "Users can view coaches at their schools" ON "public"."coaches" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "coaches"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view coaches for own and linked schools" ON "public"."coaches" FOR SELECT USING (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))))));



CREATE POLICY "Users can view coaches in their families" ON "public"."coaches" FOR SELECT USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view documents in their families" ON "public"."documents" FOR SELECT USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view events for own schools" ON "public"."events" FOR SELECT USING ((("school_id" IS NULL) OR ("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view events in their families" ON "public"."events" FOR SELECT USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view family code usage logs" ON "public"."family_code_usage_log" FOR SELECT USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view family members" ON "public"."family_members" FOR SELECT USING (("family_unit_id" IN ( SELECT "fid"."family_unit_id"
   FROM "public"."get_user_family_ids"() "fid"("family_unit_id"))));



CREATE POLICY "Users can view family members' profiles" ON "public"."users" FOR SELECT USING ((("id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."family_members" "fm1"
     JOIN "public"."family_members" "fm2" ON (("fm1"."family_unit_id" = "fm2"."family_unit_id")))
  WHERE (("fm1"."user_id" = "auth"."uid"()) AND ("fm2"."user_id" = "users"."id"))))));



CREATE POLICY "Users can view interactions for own and linked schools" ON "public"."interactions" FOR SELECT USING (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))))));



COMMENT ON POLICY "Users can view interactions for own and linked schools" ON "public"."interactions" IS 'Allows viewing interactions for schools owned by user or linked accounts';



CREATE POLICY "Users can view linked family members" ON "public"."users" FOR SELECT USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."account_links"
  WHERE (("account_links"."status" = 'accepted'::"text") AND ((("account_links"."initiator_user_id" = "auth"."uid"()) AND (("account_links"."parent_user_id" = "users"."id") OR ("account_links"."player_user_id" = "users"."id"))) OR (("account_links"."parent_user_id" = "auth"."uid"()) AND ("account_links"."player_user_id" = "users"."id")) OR (("account_links"."player_user_id" = "auth"."uid"()) AND ("account_links"."parent_user_id" = "users"."id"))))))));



CREATE POLICY "Users can view own account links" ON "public"."account_links" FOR SELECT USING ((("auth"."uid"() = "parent_user_id") OR ("auth"."uid"() = "player_user_id")));



CREATE POLICY "Users can view own and linked athlete tasks" ON "public"."athlete_task" FOR SELECT USING (("athlete_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can view own and linked documents" ON "public"."documents" FOR SELECT USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can view own and linked performance metrics" ON "public"."performance_metrics" FOR SELECT USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can view own and linked recommendation letters" ON "public"."recommendation_letters" FOR SELECT USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can view own and linked schools" ON "public"."schools" FOR SELECT USING (("user_id" IN ( SELECT "get_linked_user_ids"."user_id"
   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))));



CREATE POLICY "Users can view own audit logs" ON "public"."audit_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notes" ON "public"."user_notes" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own preferences" ON "public"."user_preferences_v1_backup" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own suggestions" ON "public"."suggestion" FOR SELECT USING (("athlete_id" = "auth"."uid"()));



COMMENT ON POLICY "Users can view own suggestions" ON "public"."suggestion" IS 'Athletes see suggestions directed at them';



CREATE POLICY "Users can view performance metrics in their families" ON "public"."performance_metrics" FOR SELECT USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view posts for own and linked schools" ON "public"."social_media_posts" FOR SELECT USING (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
           FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id"))))));



CREATE POLICY "Users can view posts for their schools" ON "public"."social_media_posts" FOR SELECT USING (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view posts for their schools and coaches" ON "public"."social_media_posts" FOR SELECT USING ((("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"()))) OR ("coach_id" IN ( SELECT "c"."id"
   FROM ("public"."coaches" "c"
     JOIN "public"."schools" "s" ON (("c"."school_id" = "s"."id")))
  WHERE ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view predefined templates" ON "public"."communication_templates" FOR SELECT TO "authenticated" USING (("is_predefined" = true));



CREATE POLICY "Users can view school status history for their families" ON "public"."school_status_history" FOR SELECT USING (("school_id" IN ( SELECT "s"."id"
   FROM "public"."schools" "s"
  WHERE ("s"."family_unit_id" IN ( SELECT "fm"."family_unit_id"
           FROM "public"."family_members" "fm"
          WHERE ("fm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view schools in their families" ON "public"."schools" FOR SELECT USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view status history for their family schools" ON "public"."school_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."schools" "s"
     JOIN "public"."family_members" "fm" ON ((("fm"."family_unit_id" = "s"."family_unit_id") AND ("fm"."user_id" = "auth"."uid"()))))
  WHERE ("s"."id" = "school_status_history"."school_id"))));



CREATE POLICY "Users can view their own events" ON "public"."events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own family memberships" ON "public"."family_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own preference history" ON "public"."preference_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own reminders" ON "public"."follow_up_reminders" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."account_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "account_links_delete_parent" ON "public"."account_links" FOR DELETE USING (("parent_user_id" = "auth"."uid"()));



CREATE POLICY "account_links_insert_parent" ON "public"."account_links" FOR INSERT WITH CHECK (("parent_user_id" = "auth"."uid"()));



CREATE POLICY "account_links_select_own" ON "public"."account_links" FOR SELECT USING ((("parent_user_id" = "auth"."uid"()) OR ("player_user_id" = "auth"."uid"())));



CREATE POLICY "account_links_update_parent" ON "public"."account_links" FOR UPDATE USING (("parent_user_id" = "auth"."uid"()));



ALTER TABLE "public"."athlete_task" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coaches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coaches_backup_pre_family" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communication_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_ownership_snapshot" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_tokens: users manage own" ON "public"."device_tokens" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents_backup_pre_family" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events_backup_pre_family" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."family_code_usage_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."family_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "family_invitations_delete" ON "public"."family_invitations" FOR DELETE USING (("invited_by" = "auth"."uid"()));



CREATE POLICY "family_invitations_insert" ON "public"."family_invitations" FOR INSERT WITH CHECK ((("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))) AND ("invited_by" = "auth"."uid"())));



CREATE POLICY "family_invitations_select" ON "public"."family_invitations" FOR SELECT USING (("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "family_invitations_update" ON "public"."family_invitations" FOR UPDATE USING (("invited_by" = "auth"."uid"()));



ALTER TABLE "public"."family_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."family_units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "family_units_delete" ON "public"."family_units" FOR DELETE USING (("created_by_user_id" = "auth"."uid"()));



CREATE POLICY "family_units_insert" ON "public"."family_units" FOR INSERT WITH CHECK (("created_by_user_id" = "auth"."uid"()));



CREATE POLICY "family_units_select" ON "public"."family_units" FOR SELECT USING (("id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "family_units_update" ON "public"."family_units" FOR UPDATE USING (("id" IN ( SELECT "family_members"."family_unit_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."follow_up_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."help_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interactions_backup_pre_family" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_preferences: users manage own" ON "public"."notification_preferences" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_insert_own" ON "public"."notifications" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parent_view_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."performance_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."performance_metrics_backup_pre_family" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "player_profiles_insert" ON "public"."player_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "player_profiles_select_own" ON "public"."player_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "player_profiles_select_public" ON "public"."player_profiles" FOR SELECT USING (("is_published" = true));



CREATE POLICY "player_profiles_update" ON "public"."player_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preference_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "preference_history_select_own" ON "public"."preference_history" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profile_tracking_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_tracking_links_select" ON "public"."profile_tracking_links" FOR SELECT USING (("profile_id" IN ( SELECT "player_profiles"."id"
   FROM "public"."player_profiles"
  WHERE ("player_profiles"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."profile_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_views_select" ON "public"."profile_views" FOR SELECT USING (("profile_id" IN ( SELECT "player_profiles"."id"
   FROM "public"."player_profiles"
  WHERE ("player_profiles"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."recommendation_letters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."school_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools_backup_pre_family" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_media_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "social_media_posts_select_family" ON "public"."social_media_posts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."coaches" "c"
     JOIN "public"."family_members" "fm" ON (("fm"."family_unit_id" = "c"."family_unit_id")))
  WHERE (("c"."id" = "social_media_posts"."coach_id") AND ("fm"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."sports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suggestion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_calendar" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_calendar_read" ON "public"."system_calendar" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."task" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_deadlines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_deadlines: users manage own" ON "public"."user_deadlines" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_deadlines_delete" ON "public"."user_deadlines" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_deadlines_insert" ON "public"."user_deadlines" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_deadlines_select" ON "public"."user_deadlines" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_deadlines_update" ON "public"."user_deadlines" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences_v1_backup" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_audit_log"("p_user_id" "uuid", "p_action" character varying, "p_resource_type" character varying, "p_resource_id" "uuid", "p_table_name" character varying, "p_description" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_ip_address" "inet", "p_user_agent" "text", "p_status" character varying, "p_error_message" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_audit_log"("p_user_id" "uuid", "p_action" character varying, "p_resource_type" character varying, "p_resource_id" "uuid", "p_table_name" character varying, "p_description" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_ip_address" "inet", "p_user_agent" "text", "p_status" character varying, "p_error_message" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_audit_log"("p_user_id" "uuid", "p_action" character varying, "p_resource_type" character varying, "p_resource_id" "uuid", "p_table_name" character varying, "p_description" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_ip_address" "inet", "p_user_agent" "text", "p_status" character varying, "p_error_message" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_expired_audit_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_expired_audit_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_expired_audit_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."duplicate_data_on_unlink"("p_link_id" "uuid", "p_user_keeping_copy" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."duplicate_data_on_unlink"("p_link_id" "uuid", "p_user_keeping_copy" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."duplicate_data_on_unlink"("p_link_id" "uuid", "p_user_keeping_copy" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accessible_athletes"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_accessible_athletes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accessible_athletes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_linked_user_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_linked_user_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_linked_user_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_primary_family_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_primary_family_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_primary_family_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_family_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_family_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_family_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_profile_link_view"("link_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_profile_link_view"("link_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_profile_link_view"("link_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_data_owner"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_data_owner"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_data_owner"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_parent_viewing_athlete"("target_athlete_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_parent_viewing_athlete"("target_athlete_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_parent_viewing_athlete"("target_athlete_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_parent_viewing_linked_athlete"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_parent_viewing_linked_athlete"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_parent_viewing_linked_athlete"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_jsonb_extract"("obj" "jsonb", "key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_jsonb_extract"("obj" "jsonb", "key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_jsonb_extract"("obj" "jsonb", "key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_player_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_player_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_player_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."snapshot_data_ownership"("p_link_id" "uuid", "p_parent_id" "uuid", "p_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."snapshot_data_ownership"("p_link_id" "uuid", "p_parent_id" "uuid", "p_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."snapshot_data_ownership"("p_link_id" "uuid", "p_parent_id" "uuid", "p_player_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_push_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_push_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_push_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_follow_up_reminders_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_follow_up_reminders_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_follow_up_reminders_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_social_posts_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_social_posts_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_social_posts_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_family_member"("family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_family_member"("family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_family_member"("family_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_document_schools"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_document_schools"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_document_schools"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_event_coaches"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_event_coaches"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_coaches"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_rec_letter_schools"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_rec_letter_schools"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_rec_letter_schools"() TO "service_role";



GRANT ALL ON TABLE "public"."account_links" TO "anon";
GRANT ALL ON TABLE "public"."account_links" TO "authenticated";
GRANT ALL ON TABLE "public"."account_links" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_task" TO "anon";
GRANT ALL ON TABLE "public"."athlete_task" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_task" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."coaches" TO "anon";
GRANT ALL ON TABLE "public"."coaches" TO "authenticated";
GRANT ALL ON TABLE "public"."coaches" TO "service_role";



GRANT ALL ON TABLE "public"."coaches_backup_pre_family" TO "anon";
GRANT ALL ON TABLE "public"."coaches_backup_pre_family" TO "authenticated";
GRANT ALL ON TABLE "public"."coaches_backup_pre_family" TO "service_role";



GRANT ALL ON TABLE "public"."communication_templates" TO "anon";
GRANT ALL ON TABLE "public"."communication_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."communication_templates" TO "service_role";



GRANT ALL ON TABLE "public"."data_ownership_snapshot" TO "anon";
GRANT ALL ON TABLE "public"."data_ownership_snapshot" TO "authenticated";
GRANT ALL ON TABLE "public"."data_ownership_snapshot" TO "service_role";



GRANT ALL ON TABLE "public"."deadline_alert_log" TO "anon";
GRANT ALL ON TABLE "public"."deadline_alert_log" TO "authenticated";
GRANT ALL ON TABLE "public"."deadline_alert_log" TO "service_role";



GRANT ALL ON TABLE "public"."device_tokens" TO "anon";
GRANT ALL ON TABLE "public"."device_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."device_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."documents_backup_pre_family" TO "anon";
GRANT ALL ON TABLE "public"."documents_backup_pre_family" TO "authenticated";
GRANT ALL ON TABLE "public"."documents_backup_pre_family" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."events_backup_pre_family" TO "anon";
GRANT ALL ON TABLE "public"."events_backup_pre_family" TO "authenticated";
GRANT ALL ON TABLE "public"."events_backup_pre_family" TO "service_role";



GRANT ALL ON TABLE "public"."family_code_usage_log" TO "anon";
GRANT ALL ON TABLE "public"."family_code_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."family_code_usage_log" TO "service_role";



GRANT ALL ON TABLE "public"."family_invitations" TO "anon";
GRANT ALL ON TABLE "public"."family_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."family_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."family_members" TO "anon";
GRANT ALL ON TABLE "public"."family_members" TO "authenticated";
GRANT ALL ON TABLE "public"."family_members" TO "service_role";



GRANT ALL ON TABLE "public"."family_units" TO "anon";
GRANT ALL ON TABLE "public"."family_units" TO "authenticated";
GRANT ALL ON TABLE "public"."family_units" TO "service_role";



GRANT ALL ON TABLE "public"."follow_up_reminders" TO "anon";
GRANT ALL ON TABLE "public"."follow_up_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."follow_up_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."help_feedback" TO "anon";
GRANT ALL ON TABLE "public"."help_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."help_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."interactions" TO "anon";
GRANT ALL ON TABLE "public"."interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."interactions" TO "service_role";



GRANT ALL ON TABLE "public"."interactions_backup_pre_family" TO "anon";
GRANT ALL ON TABLE "public"."interactions_backup_pre_family" TO "authenticated";
GRANT ALL ON TABLE "public"."interactions_backup_pre_family" TO "service_role";



GRANT ALL ON TABLE "public"."nces_schools" TO "anon";
GRANT ALL ON TABLE "public"."nces_schools" TO "authenticated";
GRANT ALL ON TABLE "public"."nces_schools" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."offers" TO "anon";
GRANT ALL ON TABLE "public"."offers" TO "authenticated";
GRANT ALL ON TABLE "public"."offers" TO "service_role";



GRANT ALL ON TABLE "public"."parent_view_log" TO "anon";
GRANT ALL ON TABLE "public"."parent_view_log" TO "authenticated";
GRANT ALL ON TABLE "public"."parent_view_log" TO "service_role";



GRANT ALL ON TABLE "public"."performance_metrics" TO "anon";
GRANT ALL ON TABLE "public"."performance_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."performance_metrics_backup_pre_family" TO "anon";
GRANT ALL ON TABLE "public"."performance_metrics_backup_pre_family" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_metrics_backup_pre_family" TO "service_role";



GRANT ALL ON TABLE "public"."player_profiles" TO "anon";
GRANT ALL ON TABLE "public"."player_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."player_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."positions" TO "anon";
GRANT ALL ON TABLE "public"."positions" TO "authenticated";
GRANT ALL ON TABLE "public"."positions" TO "service_role";



GRANT ALL ON TABLE "public"."preference_history" TO "anon";
GRANT ALL ON TABLE "public"."preference_history" TO "authenticated";
GRANT ALL ON TABLE "public"."preference_history" TO "service_role";



GRANT ALL ON TABLE "public"."profile_tracking_links" TO "anon";
GRANT ALL ON TABLE "public"."profile_tracking_links" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_tracking_links" TO "service_role";



GRANT ALL ON TABLE "public"."profile_views" TO "anon";
GRANT ALL ON TABLE "public"."profile_views" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_views" TO "service_role";



GRANT ALL ON TABLE "public"."recommendation_letters" TO "anon";
GRANT ALL ON TABLE "public"."recommendation_letters" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendation_letters" TO "service_role";



GRANT ALL ON TABLE "public"."school_status_history" TO "anon";
GRANT ALL ON TABLE "public"."school_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."school_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."schools_backup_pre_family" TO "anon";
GRANT ALL ON TABLE "public"."schools_backup_pre_family" TO "authenticated";
GRANT ALL ON TABLE "public"."schools_backup_pre_family" TO "service_role";



GRANT ALL ON TABLE "public"."social_media_posts" TO "anon";
GRANT ALL ON TABLE "public"."social_media_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."social_media_posts" TO "service_role";



GRANT ALL ON TABLE "public"."sports" TO "anon";
GRANT ALL ON TABLE "public"."sports" TO "authenticated";
GRANT ALL ON TABLE "public"."sports" TO "service_role";



GRANT ALL ON TABLE "public"."suggestion" TO "anon";
GRANT ALL ON TABLE "public"."suggestion" TO "authenticated";
GRANT ALL ON TABLE "public"."suggestion" TO "service_role";



GRANT ALL ON TABLE "public"."system_calendar" TO "anon";
GRANT ALL ON TABLE "public"."system_calendar" TO "authenticated";
GRANT ALL ON TABLE "public"."system_calendar" TO "service_role";



GRANT ALL ON TABLE "public"."task" TO "anon";
GRANT ALL ON TABLE "public"."task" TO "authenticated";
GRANT ALL ON TABLE "public"."task" TO "service_role";



GRANT ALL ON TABLE "public"."user_deadlines" TO "anon";
GRANT ALL ON TABLE "public"."user_deadlines" TO "authenticated";
GRANT ALL ON TABLE "public"."user_deadlines" TO "service_role";



GRANT ALL ON TABLE "public"."user_notes" TO "anon";
GRANT ALL ON TABLE "public"."user_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notes" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences_v1_backup" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences_v1_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences_v1_backup" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







