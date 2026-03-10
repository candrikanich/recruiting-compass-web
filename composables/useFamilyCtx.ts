import { inject } from "vue";
import { useActiveFamily, type UseActiveFamilyReturn } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";

export const useFamilyCtx = (): UseActiveFamilyReturn =>
  inject<UseActiveFamilyReturn>("activeFamily") ?? useFamilyContext();
