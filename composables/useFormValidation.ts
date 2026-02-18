/**
 * Unified Form & File Validation Composable
 *
 * Consolidates form validation (Zod) and file validation (mime types, sizes)
 * into a single, cohesive validation system.
 *
 * This replaces:
 * - useValidation() for form schema validation
 * - useDocumentValidation() for file uploads
 *
 * @example
 * const { validate, validateFile, errors, fileErrors } = useFormValidation()
 *
 * // Form validation
 * const validated = await validate(formData)
 * if (!validated) {
 *   console.log(errors.value)
 *   return
 * }
 *
 * // File validation
 * try {
 *   validateFile(file, 'transcript')
 * } catch (err) {
 *   console.log(err.message)
 * }
 */

import { ref, computed, type Ref, type ComputedRef } from "vue";
import { z } from "zod";
import { createClientLogger } from "~/utils/logger";

/**
 * Form field error type (renamed from ValidationError to avoid conflicts with useValidation composable)
 */
export interface FormFieldError {
  field: string;
  message: string;
}

export interface FileValidationError extends Error {
  code: "INVALID_TYPE" | "INVALID_SIZE" | "INVALID_EXTENSION";
}

/**
 * File type validation configuration
 * Maps document types to allowed MIME types
 */
const FILE_VALIDATION_RULES = {
  highlight_video: {
    mimeTypes: ["video/mp4", "video/quicktime", "video/x-msvideo"],
    extensions: [".mp4", ".mov", ".avi"],
    maxSize: 500 * 1024 * 1024, // 500MB
    description: "Video files (MP4, MOV, AVI)",
  },
  transcript: {
    mimeTypes: ["application/pdf", "text/plain"],
    extensions: [".pdf", ".txt"],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: "PDF or text files",
  },
  resume: {
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    extensions: [".pdf", ".doc", ".docx"],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: "PDF or Word documents",
  },
  rec_letter: {
    mimeTypes: ["application/pdf"],
    extensions: [".pdf"],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: "PDF files only",
  },
  questionnaire: {
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    extensions: [".pdf", ".doc", ".docx"],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: "PDF or Word documents",
  },
  stats_sheet: {
    mimeTypes: [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    extensions: [".csv", ".xls", ".xlsx"],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: "CSV or Excel files",
  },
  attachment: {
    mimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ],
    extensions: [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".txt",
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: "Common document and image files",
  },
} as const;

export type SupportedFileType = keyof typeof FILE_VALIDATION_RULES;

/**
 * Form & File Validation Composable
 */
export interface UseFormValidationReturn {
  // Form validation
  errors: Ref<FormFieldError[]>;
  fieldErrors: ComputedRef<Record<string, string>>;
  hasErrors: ComputedRef<boolean>;
  validate: <T>(data: unknown, schema?: z.ZodSchema<T>) => Promise<T | null>;
  validateField: (
    field: string,
    value: unknown,
    schema: z.ZodSchema,
  ) => Promise<boolean>;
  clearErrors: () => void;
  clearFieldError: (field: string) => void;
  setErrors: (errors: FormFieldError[]) => void;

  // File validation
  fileErrors: Ref<FileValidationError[]>;
  hasFileErrors: ComputedRef<boolean>;
  validateFile: (file: File, type: SupportedFileType) => void;
  validateFiles: (files: FileList | File[], type: SupportedFileType) => void;
  clearFileErrors: () => void;

  // Utilities
  getSupportedExtensions: (type: SupportedFileType) => string[];
  getFileSizeLimit: (type: SupportedFileType) => number;
  getFileDescription: (type: SupportedFileType) => string;
}

const logger = createClientLogger("useFormValidation");

export function useFormValidation(): UseFormValidationReturn {
  const errors = ref<FormFieldError[]>([]);
  const fileErrors = ref<FileValidationError[]>([]);

  // --- FORM VALIDATION COMPUTED ---

  const fieldErrors = computed(() => {
    const result: Record<string, string> = {};
    errors.value.forEach((err) => {
      result[err.field] = err.message;
    });
    return result;
  });

  const hasErrors = computed(() => errors.value.length > 0);
  const hasFileErrors = computed(() => fileErrors.value.length > 0);

  // --- FORM VALIDATION METHODS ---

  /**
   * Validate entire form data against Zod schema
   */
  const validate = async <T>(
    data: unknown,
    schema?: z.ZodSchema<T>,
  ): Promise<T | null> => {
    if (!schema) {
      logger.warn("No schema provided to validate()");
      return null;
    }

    try {
      const validated = await schema.parseAsync(data);
      errors.value = [];
      return validated;
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        errors.value = err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
      } else {
        errors.value = [{ field: "form", message: "Validation failed" }];
      }
      return null;
    }
  };

  /**
   * Validate a single form field
   */
  const validateField = async (
    field: string,
    value: unknown,
    schema: z.ZodSchema,
  ): Promise<boolean> => {
    try {
      await schema.parseAsync(value);

      // Remove existing error for this field
      errors.value = errors.value.filter((e) => e.field !== field);
      return true;
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        const message = err.issues[0]?.message || "Invalid value";
        const existingIndex = errors.value.findIndex((e) => e.field === field);

        if (existingIndex >= 0) {
          errors.value[existingIndex].message = message;
        } else {
          errors.value.push({ field, message });
        }
      }
      return false;
    }
  };

  /**
   * Clear all form errors
   */
  const clearErrors = () => {
    errors.value = [];
  };

  /**
   * Clear error for specific field
   */
  const clearFieldError = (field: string) => {
    errors.value = errors.value.filter((e) => e.field !== field);
  };

  /**
   * Manually set validation errors
   */
  const setErrors = (newErrors: FormFieldError[]) => {
    errors.value = newErrors;
  };

  // --- FILE VALIDATION METHODS ---

  /**
   * Validate a single file
   * Throws FileValidationError if validation fails
   */
  const validateFile = (file: File, type: SupportedFileType) => {
    const rules = FILE_VALIDATION_RULES[type];

    // Check MIME type
    if (!(rules.mimeTypes as unknown as string[]).includes(file.type)) {
      const error = new Error(
        `Invalid file type. Expected ${rules.description}`,
      ) as FileValidationError;
      error.code = "INVALID_TYPE";
      throw error;
    }

    // Check file extension
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!(rules.extensions as unknown as string[]).includes(ext)) {
      const error = new Error(
        `Invalid file extension. Expected ${rules.extensions.join(", ")}`,
      ) as FileValidationError;
      error.code = "INVALID_EXTENSION";
      throw error;
    }

    // Check file size
    if (file.size > rules.maxSize) {
      const maxMb = Math.round(rules.maxSize / 1024 / 1024);
      const error = new Error(
        `File too large. Maximum size is ${maxMb}MB`,
      ) as FileValidationError;
      error.code = "INVALID_SIZE";
      throw error;
    }
  };

  /**
   * Validate multiple files
   * Collects all errors before throwing
   */
  const validateFiles = (files: FileList | File[], type: SupportedFileType) => {
    const fileArray = Array.from(files);
    const collectedErrors: FileValidationError[] = [];

    for (const file of fileArray) {
      try {
        validateFile(file, type);
      } catch (err) {
        if (err instanceof Error) {
          const error = err as FileValidationError;
          error.message = `${file.name}: ${error.message}`;
          collectedErrors.push(error);
        }
      }
    }

    if (collectedErrors.length > 0) {
      fileErrors.value = collectedErrors;
      throw collectedErrors[0];
    }
  };

  /**
   * Clear all file errors
   */
  const clearFileErrors = () => {
    fileErrors.value = [];
  };

  // --- UTILITY METHODS ---

  const getSupportedExtensions = (type: SupportedFileType): string[] => {
    return FILE_VALIDATION_RULES[type].extensions as unknown as string[];
  };

  const getFileSizeLimit = (type: SupportedFileType): number => {
    return FILE_VALIDATION_RULES[type].maxSize;
  };

  const getFileDescription = (type: SupportedFileType): string => {
    return FILE_VALIDATION_RULES[type].description;
  };

  return {
    // Form validation
    errors,
    fieldErrors,
    hasErrors,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    setErrors,

    // File validation
    fileErrors,
    hasFileErrors,
    validateFile,
    validateFiles,
    clearFileErrors,

    // Utilities
    getSupportedExtensions,
    getFileSizeLimit,
    getFileDescription,
  };
}
