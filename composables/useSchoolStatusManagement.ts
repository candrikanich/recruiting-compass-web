import { ref } from "vue";
import type { School } from "~/types/models";
import { useSchools } from "~/composables/useSchools";

export const useSchoolStatusManagement = (schoolId: string) => {
  const { updateSchool, updateStatus: updateSchoolStatus } = useSchools();

  const statusUpdating = ref(false);
  const priorityUpdating = ref(false);

  const updateStatus = async (
    status: School["status"],
  ): Promise<School | null> => {
    statusUpdating.value = true;
    try {
      const updated = await updateSchoolStatus(schoolId, status);
      return updated;
    } catch (err) {
      console.error("Failed to update status:", err);
      return null;
    } finally {
      statusUpdating.value = false;
    }
  };

  const updatePriority = async (
    tier: "A" | "B" | "C" | null,
  ): Promise<School | null> => {
    priorityUpdating.value = true;
    try {
      const updated = await updateSchool(schoolId, { priority_tier: tier });
      return updated;
    } finally {
      priorityUpdating.value = false;
    }
  };

  const toggleFavorite = async (
    currentSchool: School,
  ): Promise<School | null> => {
    const updated = await updateSchool(schoolId, {
      is_favorite: !currentSchool.is_favorite,
    });
    return updated;
  };

  return {
    statusUpdating,
    priorityUpdating,
    updateStatus,
    updatePriority,
    toggleFavorite,
  };
};
