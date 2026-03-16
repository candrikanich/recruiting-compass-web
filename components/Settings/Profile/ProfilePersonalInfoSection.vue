<template>
  <section class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
    <h2 class="text-lg font-semibold text-slate-900 mb-4">Personal Information</h2>

    <form class="space-y-4" @submit.prevent="handleSave">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1" for="full-name">
          Full Name <span class="text-red-500">*</span>
        </label>
        <UInput
          id="full-name"
          v-model="form.full_name"
          placeholder="Your full name"
          :disabled="loading"
        />
        <p v-if="nameError" class="text-sm text-red-600 mt-1">{{ nameError }}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1" for="phone">
          Phone <span class="text-slate-600 font-normal">(optional)</span>
        </label>
        <UInput
          id="phone"
          v-model="form.phone"
          type="tel"
          placeholder="555-555-5555"
          :disabled="loading"
        />
      </div>

      <div v-if="isAthlete">
        <label class="block text-sm font-medium text-slate-700 mb-1" for="dob">
          Date of Birth <span class="text-slate-600 font-normal">(optional)</span>
        </label>
        <UInput
          id="dob"
          v-model="form.date_of_birth"
          type="date"
          :disabled="loading"
        />
      </div>

      <div class="flex items-center gap-3 pt-2">
        <UButton type="submit" :loading="loading">Save</UButton>
        <p v-if="saved" class="text-sm text-emerald-600">Saved!</p>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useUserStore } from "~/stores/user";
import { useUserProfile } from "~/composables/useUserProfile";

const store = useUserStore();
const {
  savePersonalInfo,
  personalInfoLoading: loading,
  personalInfoError: error,
  personalInfoSaved: saved,
  isAthlete,
} = useUserProfile();

const form = ref({
  full_name: store.user?.full_name ?? "",
  phone: store.user?.phone ?? "",
  date_of_birth: store.user?.date_of_birth ?? "",
});

const nameError = ref<string | null>(null);

async function handleSave() {
  nameError.value = null;
  if (!form.value.full_name.trim()) {
    nameError.value = "Name is required.";
    return;
  }
  await savePersonalInfo({
    full_name: form.value.full_name.trim(),
    phone: form.value.phone || null,
    date_of_birth: form.value.date_of_birth || null,
  });
}
</script>
