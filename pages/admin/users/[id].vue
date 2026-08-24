<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAdminUserDetail } from "~/composables/useAdminUserDetail";

definePageMeta({ layout: "admin", middleware: ["auth", "admin"] });

const route = useRoute();
const { data, loading, error, fetchDetail } = useAdminUserDetail();

// Explicit `.value` access (not template auto-unref) so this works whether
// the composable returns a real ref or a test double shaped like one.
const detail = computed(() => data.value);
const isLoading = computed(() => loading.value);
const loadError = computed(() => error.value);

onMounted(() => fetchDetail(String(route.params.id)));
</script>

<template>
  <section>
    <div
      class="mb-4 rounded-md border border-brand-red-300 bg-brand-red-50 px-4 py-2 text-sm font-medium text-brand-red-700"
    >
      Read-only admin view — you are viewing
      <span class="font-semibold">{{ detail?.account.email ?? "…" }}</span
      >'s data.
    </div>

    <DesignSystemLoadingState v-if="isLoading" />
    <DesignSystemErrorState v-else-if="loadError" :error="loadError" />
    <template v-else-if="detail">
      <h1 class="mb-4 text-xl font-semibold text-brand-slate-900">
        {{ detail.account.full_name || detail.account.email }}
      </h1>

      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <AdminStatTile
          label="Schools"
          :value="detail.recruiting.counts.schools"
        />
        <AdminStatTile
          label="Coaches"
          :value="detail.recruiting.counts.coaches"
        />
        <AdminStatTile
          label="Interactions"
          :value="detail.recruiting.counts.interactions"
        />
        <AdminStatTile
          label="Offers"
          :value="detail.recruiting.counts.offers"
        />
        <AdminStatTile
          label="Events"
          :value="detail.recruiting.counts.events"
        />
        <AdminStatTile
          label="Messages"
          :value="detail.recruiting.counts.messages"
        />
      </div>

      <!-- Account facts -->
      <dl class="mb-6 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div>
          <dt class="text-brand-slate-500">Role</dt>
          <dd class="text-brand-slate-800">{{ detail.account.role }}</dd>
        </div>
        <div>
          <dt class="text-brand-slate-500">Admin</dt>
          <dd class="text-brand-slate-800">
            {{ detail.account.is_admin ? "Yes" : "No" }}
          </dd>
        </div>
        <div>
          <dt class="text-brand-slate-500">Phase</dt>
          <dd class="text-brand-slate-800">
            {{ detail.account.current_phase ?? "—" }}
          </dd>
        </div>
        <div>
          <dt class="text-brand-slate-500">Grad year</dt>
          <dd class="text-brand-slate-800">
            {{ detail.account.graduation_year ?? "—" }}
          </dd>
        </div>
        <div>
          <dt class="text-brand-slate-500">Onboarded</dt>
          <dd class="text-brand-slate-800">
            {{ detail.account.onboarding_completed ? "Yes" : "No" }}
          </dd>
        </div>
        <div>
          <dt class="text-brand-slate-500">Joined</dt>
          <dd class="text-brand-slate-800">
            {{ new Date(detail.account.created_at).toLocaleDateString() }}
          </dd>
        </div>
      </dl>

      <!-- Family members -->
      <h2 class="mb-2 text-sm font-semibold text-brand-slate-700">
        Family members ({{ detail.family.members.length }})
      </h2>
      <AdminDataTable
        class="mb-6"
        :columns="[
          { key: 'full_name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
        ]"
        :rows="detail.family.members"
      />
    </template>
  </section>
</template>
