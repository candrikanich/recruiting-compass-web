<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-xl shadow-lg p-8 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Processing Invitation</h2>
        <p class="text-gray-600">Please wait while we verify your invitation...</p>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="bg-white rounded-xl shadow-lg p-8 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Invitation Accepted!</h2>
        <p class="text-gray-600 mb-6">
          Your invitation has been accepted. The initiator will now need to confirm the link to activate data sharing.
        </p>
        <NuxtLink
          to="/settings/account-linking"
          class="inline-block px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          View Account Linking
        </NuxtLink>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white rounded-xl shadow-lg p-8">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Unable to Accept Invitation</h2>
        <p class="text-gray-600 mb-4">{{ error }}</p>

        <div class="space-y-3">
          <NuxtLink
            to="/settings/account-linking"
            class="block text-center px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Go to Account Linking
          </NuxtLink>
          <NuxtLink
            to="/dashboard"
            class="block text-center px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            Return to Dashboard
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "~/stores/user";
import { useSupabase } from "~/composables/useSupabase";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const loading = ref(true);
const success = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const token = route.query.token as string;

    if (!token) {
      error.value = "Invalid invitation link - no token provided";
      loading.value = false;
      return;
    }

    // Check if user is logged in
    if (!userStore.user?.id) {
      // Redirect to signup with return URL
      router.push({
        path: "/signup",
        query: { redirect: route.fullPath },
      });
      return;
    }

    // Get CSRF token and auth token
    const { token: csrfToken } = await $fetch<{ token: string }>(
      "/api/csrf-token"
    );

    const supabase = useSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    if (!authToken) {
      error.value = "Not authenticated. Please log in and try again.";
      loading.value = false;
      return;
    }

    // Accept the invitation via API
    const result = await $fetch<{ success: boolean; message: string }>(
      "/api/account-links/accept-by-token",
      {
        method: "POST",
        headers: {
          "x-csrf-token": csrfToken,
          Authorization: `Bearer ${authToken}`,
        },
        body: { token },
      }
    );

    if (result.success) {
      success.value = true;
      loading.value = false;
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push("/settings/account-linking");
      }, 3000);
    } else {
      error.value = "Failed to accept invitation. The link may have expired.";
      loading.value = false;
    }
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message;
    } else if (err && typeof err === "object" && "data" in err) {
      const errorData = err as any;
      error.value = errorData.data?.message || "Failed to accept invitation";
    } else {
      error.value = "An unexpected error occurred";
    }
    loading.value = false;
  }
});
</script>
