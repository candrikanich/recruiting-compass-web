<script setup lang="ts">
import { extractFilename } from "~/utils/formatters";

interface Props {
  attachments: string[];
}

defineProps<Props>();

const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "File";
};

const getFileTypeLabel = (url: string): string => {
  const filename = extractFilename(url);
  const ext = getFileExtension(filename).toLowerCase();

  const typeMap: Record<string, string> = {
    pdf: "PDF document",
    doc: "Word document",
    docx: "Word document",
    xls: "Excel spreadsheet",
    xlsx: "Excel spreadsheet",
    ppt: "PowerPoint presentation",
    pptx: "PowerPoint presentation",
    txt: "Text file",
    png: "PNG image",
    jpg: "JPEG image",
    jpeg: "JPEG image",
    gif: "GIF image",
    svg: "SVG image",
    zip: "ZIP archive",
  };

  return typeMap[ext] || `${ext.toUpperCase()} file`;
};
</script>

<template>
  <section aria-labelledby="attachments-heading">
    <div class="rounded-lg bg-white p-6 shadow-sm">
      <h2 id="attachments-heading" class="mb-4 text-xl font-bold">
        Attachments ({{ attachments.length }})
      </h2>
      <div class="grid grid-cols-2 gap-4">
        <a
          v-for="(url, idx) in attachments"
          :key="idx"
          :href="url"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`Download ${extractFilename(url)} (${getFileTypeLabel(url)}). Opens in new window`"
          class="rounded-lg border p-4 transition hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <div class="flex items-start gap-2">
            <span aria-hidden="true" class="text-lg">📎</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium break-all text-blue-600">
                {{ extractFilename(url) }}
              </p>
              <p class="mt-1 text-xs text-gray-500">
                {{ getFileTypeLabel(url) }}
              </p>
            </div>
            <svg
              aria-hidden="true"
              class="h-4 w-4 shrink-0 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>
