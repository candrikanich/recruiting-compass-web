import { ref } from "vue";
import type { School, AcademicInfo } from "~/types/models";
import { useSchools } from "~/composables/useSchools";

export interface BasicInfoFormData {
  address: string;
  baseball_facility_address: string;
  mascot: string;
  undergrad_size: string;
  distance_from_home: number | null;
  website: string;
  twitter_handle: string;
  instagram_handle: string;
}

export const useSchoolBasicInfo = (schoolId: string) => {
  const { updateSchool } = useSchools();

  const editingBasicInfo = ref(false);
  const editedBasicInfo = ref<BasicInfoFormData>({
    address: "",
    baseball_facility_address: "",
    mascot: "",
    undergrad_size: "",
    distance_from_home: null,
    website: "",
    twitter_handle: "",
    instagram_handle: "",
  });

  const initializeForm = (school: School) => {
    editedBasicInfo.value = {
      address: String(school.academic_info?.address || ""),
      baseball_facility_address: String(
        school.academic_info?.baseball_facility_address || "",
      ),
      mascot: String(school.academic_info?.mascot || ""),
      undergrad_size: String(school.academic_info?.undergrad_size || ""),
      distance_from_home:
        typeof school.academic_info?.distance_from_home === "number"
          ? school.academic_info.distance_from_home
          : null,
      website: String(school.website || ""),
      twitter_handle: String(school.twitter_handle || ""),
      instagram_handle: String(school.instagram_handle || ""),
    };
  };

  const saveBasicInfo = async (
    currentSchool: School,
  ): Promise<School | null> => {
    const updates = {
      website: editedBasicInfo.value.website || null,
      twitter_handle: editedBasicInfo.value.twitter_handle || null,
      instagram_handle: editedBasicInfo.value.instagram_handle || null,
      academic_info: {
        ...(currentSchool.academic_info || {}),
        address: editedBasicInfo.value.address,
        baseball_facility_address:
          editedBasicInfo.value.baseball_facility_address,
        mascot: editedBasicInfo.value.mascot,
        undergrad_size: editedBasicInfo.value.undergrad_size,
        distance_from_home: editedBasicInfo.value.distance_from_home,
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
