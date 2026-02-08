import { ref } from "vue";

export const useLiveRegion = () => {
  const announcement = ref("");

  const announce = (message: string) => {
    announcement.value = "";
    requestAnimationFrame(() => {
      announcement.value = message;
    });
  };

  const liveRegionAttrs = {
    role: "status" as const,
    "aria-live": "polite" as const,
    "aria-atomic": "true" as const,
    class: "sr-only",
  };

  return { announcement, announce, liveRegionAttrs };
};
