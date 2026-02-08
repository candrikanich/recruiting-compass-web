import { nextTick } from "vue";

type FocusErrorSummaryOptions = {
  elementId?: string;
  shouldScroll?: boolean;
};

const DEFAULT_ELEMENT_ID = "form-error-summary";

export const useFormErrorFocus = (options?: FocusErrorSummaryOptions) => {
  const elementId = options?.elementId ?? DEFAULT_ELEMENT_ID;
  const shouldScroll = options?.shouldScroll ?? true;

  const focusErrorSummary = async (): Promise<boolean> => {
    await nextTick();
    const errorSummary = document.getElementById(elementId);
    if (!errorSummary) {
      return false;
    }
    errorSummary.focus();
    if (shouldScroll) {
      errorSummary.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    return true;
  };

  return { focusErrorSummary };
};
