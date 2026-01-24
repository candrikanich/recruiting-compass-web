/**
 * Document file validation utilities
 * Centralized validation logic for document uploads
 */

// File validation constants
const ALLOWED_MIME_TYPES = {
  highlight_video: ["video/mp4", "video/quicktime", "video/x-msvideo"],
  transcript: ["application/pdf", "text/plain"],
  resume: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  rec_letter: ["application/pdf"],
  questionnaire: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  stats_sheet: [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

const ALLOWED_EXTENSIONS = {
  highlight_video: [".mp4", ".mov", ".avi"],
  transcript: [".pdf", ".txt"],
  resume: [".pdf", ".doc", ".docx"],
  rec_letter: [".pdf"],
  questionnaire: [".pdf", ".doc", ".docx"],
  stats_sheet: [".csv", ".xls", ".xlsx"],
};

const FILE_SIZE_LIMITS = {
  highlight_video: 100 * 1024 * 1024, // 100MB
  transcript: 10 * 1024 * 1024, // 10MB
  resume: 5 * 1024 * 1024, // 5MB
  rec_letter: 10 * 1024 * 1024, // 10MB
  questionnaire: 10 * 1024 * 1024, // 10MB
  stats_sheet: 5 * 1024 * 1024, // 5MB
};

// Deprecation warning: consolidated into useFormValidation().validateFile()
if (process.env.NODE_ENV !== "test") {
   
  console.warn(
    "[DEPRECATED] `useDocumentValidation` is deprecated. Use `useFormValidation().validateFile()` from `~/composables/useFormValidation` instead.",
  );
}

/**
 * Validate a file for document upload
 *
 * Checks:
 * - MIME type or file extension matches document type
 * - File size is within limits
 *
 * @param file - The file to validate
 * @param documentType - The document type (e.g., 'resume', 'transcript')
 * @returns Validation result with error message if invalid
 */
export const validateFile = (
  file: File,
  documentType: string,
): { valid: boolean; error?: string } => {
  const typeKey = documentType as keyof typeof ALLOWED_MIME_TYPES;

  if (!ALLOWED_MIME_TYPES[typeKey]) {
    return { valid: false, error: "Invalid document type" };
  }

  const allowedTypes = ALLOWED_MIME_TYPES[typeKey];
  const allowedExts = ALLOWED_EXTENSIONS[typeKey];
  const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

  // Check MIME type or file extension
  const isValidType =
    allowedTypes.includes(file.type) || allowedExts.includes(fileExtension);
  if (!isValidType) {
    return {
      valid: false,
      error: `File type not allowed. Accepted: ${allowedExts.join(", ")}`,
    };
  }

  const maxSize = FILE_SIZE_LIMITS[typeKey];
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File too large. Maximum size: ${maxMB}MB` };
  }

  return { valid: true };
};

/**
 * Get allowed extensions for a document type
 */
export const getAllowedExtensions = (documentType: string): string[] => {
  const typeKey = documentType as keyof typeof ALLOWED_EXTENSIONS;
  return ALLOWED_EXTENSIONS[typeKey] || [];
};

/**
 * Get file size limit for a document type in MB
 */
export const getFileSizeLimit = (documentType: string): number => {
  const typeKey = documentType as keyof typeof FILE_SIZE_LIMITS;
  const limit = FILE_SIZE_LIMITS[typeKey];
  return limit ? Math.round(limit / (1024 * 1024)) : 0;
};
