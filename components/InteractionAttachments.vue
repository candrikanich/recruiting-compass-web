<template>
  <div
    v-if="attachments && attachments.length > 0"
    class="mt-3 border-t border-slate-300 pt-3"
  >
    <p class="mb-2 text-xs font-semibold text-slate-600">
      📎 Attachments ({{ attachments.length }})
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="(filepath, idx) in attachments"
        :key="idx"
        @click="handleDownload(filepath)"
        class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700 transition hover:bg-blue-200"
      >
        {{ getFileIcon(filepath) }} {{ getFileName(filepath) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAttachments } from "~/composables/useAttachments";

interface Props {
  attachments?: string[];
}

defineProps<Props>();

const { downloadAttachment } = useAttachments();

const getFileName = (filepath: string): string => {
  const parts = filepath.split("/");
  const filename = parts[parts.length - 1];
  // Remove timestamp prefix
  const withoutTimestamp = filename.replace(/^\d+-/, "");
  return withoutTimestamp.length > 20
    ? withoutTimestamp.substring(0, 17) + "..."
    : withoutTimestamp;
};

const getFileIcon = (filepath: string): string => {
  const ext = filepath.split(".").pop()?.toLowerCase();
  const icons: Record<string, string> = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    mp4: "🎥",
    mov: "🎥",
  };
  return icons[ext || ""] || "📎";
};

const handleDownload = async (filepath: string) => {
  await downloadAttachment(filepath);
};
</script>
