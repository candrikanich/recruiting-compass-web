import { ref } from "vue";
import type { School, AcademicInfo } from "~/types/models";
import { useSchools } from "~/composables/useSchools";

// Contact & Social edit form. Address lives in academic_info (preserved
// alongside lookup-populated fields via spread); website/socials/phone are
// top-level school columns.
export interface BasicInfoFormData {
  address: string;
  website: string;
  athletics_url: string;
  twitter_handle: string;
  instagram_handle: string;
  phone: string;
}

export const useSchoolBasicInfo = (schoolId: string) => {
  const { updateSchool } = useSchools();

  const editingBasicInfo = ref(false);
  const editedBasicInfo = ref<BasicInfoFormData>({
    address: "",
    website: "",
    athletics_url: "",
    twitter_handle: "",
    instagram_handle: "",
    phone: "",
  });

  const initializeForm = (school: School) => {
    editedBasicInfo.value = {
      address: String(school.academic_info?.address || ""),
      website: String(school.website || ""),
      athletics_url: String(school.athletics_url || ""),
      twitter_handle: String(school.twitter_handle || ""),
      instagram_handle: String(school.instagram_handle || ""),
      phone: String(school.phone || ""),
    };
  };

  const saveBasicInfo = async (
    currentSchool: School,
  ): Promise<School | null> => {
    const updates = {
      website: editedBasicInfo.value.website || null,
      athletics_url: editedBasicInfo.value.athletics_url || null,
      twitter_handle: editedBasicInfo.value.twitter_handle || null,
      instagram_handle: editedBasicInfo.value.instagram_handle || null,
      phone: editedBasicInfo.value.phone || null,
      academic_info: {
        ...(currentSchool.academic_info || {}),
        address: editedBasicInfo.value.address,
      } as unknown as AcademicInfo,
    };

    const updated = await updateSchool(schoolId, updates);
    if (updated) {
      editingBasicInfo.value = false;
      return updated;
    }
    return null;
  };

  const cancelEdit = () => {
    editingBasicInfo.value = false;
  };

  const startEdit = () => {
    editingBasicInfo.value = true;
  };

  return {
    editingBasicInfo,
    editedBasicInfo,
    initializeForm,
    saveBasicInfo,
    cancelEdit,
    startEdit,
  };
};
