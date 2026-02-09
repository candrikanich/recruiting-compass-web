import type { School } from "~/types/models";
import { useSchools } from "~/composables/useSchools";

export const useSchoolProsCons = (schoolId: string) => {
  const { updateSchool } = useSchools();

  const addPro = async (
    currentSchool: School,
    proValue: string,
  ): Promise<School | null> => {
    if (!proValue.trim()) return null;
    const updated = await updateSchool(schoolId, {
      pros: [...(currentSchool.pros ?? []), proValue],
    });
    return updated;
  };

  const removePro = async (
    currentSchool: School,
    index: number,
  ): Promise<School | null> => {
    const newPros = (currentSchool.pros ?? []).filter((_, i) => i !== index);
    const updated = await updateSchool(schoolId, { pros: newPros });
    return updated;
  };

  const addCon = async (
    currentSchool: School,
    conValue: string,
  ): Promise<School | null> => {
    if (!conValue.trim()) return null;
    const updated = await updateSchool(schoolId, {
      cons: [...(currentSchool.cons ?? []), conValue],
    });
    return updated;
  };

  const removeCon = async (
    currentSchool: School,
    index: number,
  ): Promise<School | null> => {
    const newCons = (currentSchool.cons ?? []).filter((_, i) => i !== index);
    const updated = await updateSchool(schoolId, { cons: newCons });
    return updated;
  };

  return {
    addPro,
    removePro,
    addCon,
    removeCon,
  };
};
