<template>
  <div class="rounded-lg p-3 bg-blue-50 border border-blue-200">
    <p class="text-xs font-semibold mb-2 text-blue-900">
      Variables in this template
    </p>
    <div class="space-y-1">
      <div
        v-for="row in channel.variableRows.value"
        :key="row.key"
        class="grid grid-cols-2 gap-2 text-xs items-center"
      >
        <span class="font-mono text-blue-800">{{ tokenOf(row.key) }}</span>

        <!-- Inline profile edit (athlete editing their own data) -->
        <div v-if="row.editable" class="flex flex-col gap-0.5">
          <div class="flex items-center gap-1">
            <input
              v-model="channel.inputs.value[row.key]"
              type="text"
              :placeholder="row.value ? '' : 'add…'"
              :disabled="channel.savingKey.value === row.key"
              class="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-slate-300 text-xs text-slate-900"
              @keydown.enter.prevent="channel.saveField(row)"
            />
            <button
              type="button"
              :disabled="channel.savingKey.value === row.key"
              class="px-1.5 py-0.5 rounded bg-blue-600 text-white text-xs disabled:opacity-50"
              @click="channel.saveField(row)"
            >
              Save
            </button>
          </div>
          <span
            v-if="channel.saveErrors.value[row.key]"
            class="text-red-600 text-[10px]"
            >{{ channel.saveErrors.value[row.key] }}</span
          >
        </div>

        <!-- Authored per-message input (not persisted) -->
        <div v-else-if="row.authored" class="flex flex-col gap-0.5">
          <input
            v-model="channel.authored.value[row.key]"
            type="text"
            placeholder="write for this message…"
            class="w-full min-w-0 px-1.5 py-0.5 rounded border border-slate-300 text-xs text-slate-900"
            @blur="channel.reresolve()"
          />
          <span class="text-slate-400 text-[10px]">for this message only</span>
        </div>

        <!-- Read-only value or profile link -->
        <div v-else class="flex items-center gap-2 min-w-0">
          <span v-if="row.value" class="text-slate-700 truncate">{{
            row.value
          }}</span>
          <span v-else class="text-amber-600 font-medium">needs input</span>
          <NuxtLink
            v-if="row.linkToProfile"
            :to="PROFILE_EDIT_ROUTE"
            class="text-blue-600 hover:underline shrink-0"
            >Edit in profile →</NuxtLink
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  tokenOf,
  PROFILE_EDIT_ROUTE,
  type ChannelController,
} from "~/composables/useQuickCommunication";

defineProps<{ channel: ChannelController }>();
</script>
