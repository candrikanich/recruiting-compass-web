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
    <div class="bg-white rounded-lg shadow p-6">
      <h2 id="attachments-heading" class="text-xl font-bold mb-4">
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
          class="p-4 border rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <div class="flex items-start gap-2">
            <span aria-hidden="true" class="text-lg">📎</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-blue-600 break-all">
                {{ extractFilename(url) }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                {{ getFileTypeLabel(url) }}
              </p>
            </div>
            <svg
              aria-hidden="true"
              class="w-4 h-4 text-gray-400 flex-shrink-0"
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
