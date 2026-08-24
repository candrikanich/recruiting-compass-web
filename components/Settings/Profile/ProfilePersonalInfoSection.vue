<template>
  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <h2 class="mb-4 text-lg font-semibold text-slate-900">
      Personal Information
    </h2>

    <form class="space-y-4" @submit.prevent="handleSave">
      <div>
        <label
          class="mb-1 block text-sm font-medium text-slate-700"
          for="full-name"
        >
          Full Name <span class="text-red-500">*</span>
        </label>
        <UInput
          id="full-name"
          v-model="form.full_name"
          placeholder="Your full name"
          :disabled="loading"
        />
        <p v-if="nameError" class="mt-1 text-sm text-red-600">
          {{ nameError }}
        </p>
      </div>

      <div v-if="isAthlete">
        <label class="mb-1 block text-sm font-medium text-slate-700" for="dob">
          Date of Birth
          <span class="font-normal text-slate-600">(optional)</span>
        </label>
        <UInput
          id="dob"
          v-model="form.date_of_birth"
          type="date"
          :disabled="loading"
        />
        <p class="mt-1 text-xs text-slate-500">
          Recruiting Compass is for ages 13 and up. By entering a date of birth,
          you confirm you are 13 or older.
        </p>
        <p v-if="dobError" class="mt-1 text-sm text-red-600">{{ dobError }}</p>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <UButton type="submit" :loading="loading">Save</UButton>
        <p
          v-if="saved"
          role="status"
          aria-live="polite"
          class="text-sm text-emerald-600"
        >
          Saved!
        </p>
        <p v-if="error" role="alert" class="text-sm text-red-600">
          {{ error }}
        </p>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useUserStore } from "~/stores/user";
import { useUserProfile } from "~/composables/useUserProfile";
import { isUnderMinimumAge } from "~/utils/age";

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
  date_of_birth: store.user?.date_of_birth ?? "",
});

const nameError = ref<string | null>(null);
const dobError = ref<string | null>(null);

async function handleSave() {
  nameError.value = null;
  dobError.value = null;
  if (!form.value.full_name.trim()) {
    nameError.value = "Name is required.";
    return;
  }
  if (isUnderMinimumAge(form.value.date_of_birth)) {
    dobError.value =
      "You must be at least 13 years old to use Recruiting Compass.";
    return;
  }
  await savePersonalInfo({
    full_name: form.value.full_name.trim(),
    date_of_birth: form.value.date_of_birth || null,
  });
}
</script>
