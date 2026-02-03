import { ref, computed } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";

import { socialMediaPostSchema } from "~/utils/validation/schemas";
import { sanitizeHtml, sanitizeUrl } from "~/utils/validation/sanitize";

export interface SocialPost {
  id: string;
  coach_id?: string | null;
  school_id: string;
  platform: "twitter" | "instagram";
  post_url: string;
  post_content: string;
  post_date: string;
  author_handle: string;
  author_name: string;
  is_recruiting_related: boolean;
  flagged_for_review: boolean;
  sentiment?: "positive" | "neutral" | "negative" | "very_positive" | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const useSocialMedia = () => {
  const supabase = useSupabase();
  const _userStore = useUserStore();

  const posts = ref<SocialPost[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchPosts = async (filters?: {
    platform?: "twitter" | "instagram";
    schoolId?: string;
    coachId?: string;
    flaggedOnly?: boolean;
    recruitingOnly?: boolean;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      let query = supabase
        .from("social_media_posts")
        .select("*")
        .order("post_date", { ascending: false });

      if (filters?.platform) {
        query = query.eq("platform", filters.platform);
      }

      if (filters?.schoolId) {
        query = query.eq("school_id", filters.schoolId);
      }

      if (filters?.coachId) {
        query = query.eq("coach_id", filters.coachId);
      }

      if (filters?.flaggedOnly) {
        query = query.eq("flagged_for_review", true);
      }

      if (filters?.recruitingOnly) {
        query = query.eq("is_recruiting_related", true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      posts.value = data || [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch social posts";
      error.value = message;
      console.error("Social posts fetch error:", message);
    } finally {
      loading.value = false;
    }
  };

  const createPost = async (
    postData: Omit<SocialPost, "id" | "created_at" | "updated_at">,
  ) => {
    loading.value = true;
    error.value = null;

    try {
      // Validate post data with Zod schema
      const validated = await socialMediaPostSchema.parseAsync(postData);

      // CRITICAL: Sanitize external content to prevent XSS
      // Twitter and Instagram content must be sanitized before storage
      if (validated.post_content) {
        validated.post_content = sanitizeHtml(validated.post_content);
      }

      // Sanitize author information
      if (validated.author_name) {
        validated.author_name = sanitizeHtml(validated.author_name);
      }
      if (validated.author_handle) {
        validated.author_handle = sanitizeHtml(validated.author_handle);
      }

      // Validate and sanitize URL
      const sanitizedUrl = sanitizeUrl(validated.post_url);
      if (!sanitizedUrl) {
        throw new Error("Invalid post URL");
      }
      validated.post_url = sanitizedUrl;

      const { data, error: insertError } = (await (
        supabase.from("social_media_posts") as any
      )
        .insert([validated])
        .select()
        .single()) as { data: SocialPost; error: any };

      if (insertError) throw insertError;

      posts.value.unshift(data);
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create post";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePost = async (id: string, updates: Partial<SocialPost>) => {
    loading.value = true;
    error.value = null;

    try {
      // Sanitize content fields to prevent XSS
      const sanitizedUpdates = { ...updates };

      if (sanitizedUpdates.post_content) {
        sanitizedUpdates.post_content = sanitizeHtml(
          sanitizedUpdates.post_content,
        );
      }
      if (sanitizedUpdates.author_name) {
        sanitizedUpdates.author_name = sanitizeHtml(
          sanitizedUpdates.author_name,
        );
      }
      if (sanitizedUpdates.author_handle) {
        sanitizedUpdates.author_handle = sanitizeHtml(
          sanitizedUpdates.author_handle,
        );
      }
      if (sanitizedUpdates.notes) {
        sanitizedUpdates.notes = sanitizeHtml(sanitizedUpdates.notes);
      }

      const { data, error: updateError } = (await (
        supabase.from("social_media_posts") as any
      )
        .update(sanitizedUpdates)
        .eq("id", id)
        .select()
        .single()) as { data: SocialPost; error: any };

      if (updateError) throw updateError;

      const index = posts.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        posts.value[index] = data;
      }

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update post";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const toggleFlagged = async (id: string, flagged: boolean) => {
    return updatePost(id, { flagged_for_review: flagged });
  };

  const deletePost = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { error: deleteError } = await supabase
        .from("social_media_posts")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      posts.value = posts.value.filter((p) => p.id !== id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete post";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Computed filters
  const twitterPosts = computed(() =>
    posts.value.filter((p) => p.platform === "twitter"),
  );
  const instagramPosts = computed(() =>
    posts.value.filter((p) => p.platform === "instagram"),
  );
  const flaggedPosts = computed(() =>
    posts.value.filter((p) => p.flagged_for_review),
  );
  const recruitingPosts = computed(() =>
    posts.value.filter((p) => p.is_recruiting_related),
  );

  // Group posts by school
  const postsBySchool = computed(() => {
    const grouped: Record<string, SocialPost[]> = {};
    posts.value.forEach((post) => {
      if (!grouped[post.school_id]) {
        grouped[post.school_id] = [];
      }
      grouped[post.school_id].push(post);
    });
    return grouped;
  });

  // Group posts by coach
  const postsByCoach = computed(() => {
    const grouped: Record<string, SocialPost[]> = {};
    posts.value.forEach((post) => {
      if (post.coach_id) {
        if (!grouped[post.coach_id]) {
          grouped[post.coach_id] = [];
        }
        grouped[post.coach_id].push(post);
      }
    });
    return grouped;
  });

  return {
    posts: computed(() => posts.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    twitterPosts,
    instagramPosts,
    flaggedPosts,
    recruitingPosts,
    postsBySchool,
    postsByCoach,
    fetchPosts,
    createPost,
    updatePost,
    toggleFlagged,
    deletePost,
  };
};
