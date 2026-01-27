import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Validate file before upload
 */
export const validateAttachmentFile = (file: File): void => {
  const ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `File type ${file.type} not allowed. Accepted: PDF, images, Word docs, Excel, text files`,
    );
  }

  if (file.size > MAX_SIZE) {
    throw new Error(
      `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 10MB`,
    );
  }
};

/**
 * Upload attachment files for an interaction
 */
export const uploadInteractionAttachments = async (
  supabase: SupabaseClient,
  files: File[],
  interactionId: string,
): Promise<string[]> => {
  const uploadedPaths: string[] = [];

  for (const file of files) {
    try {
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const filepath = `interactions/${interactionId}/${filename}`;

      const { data, error: uploadError } = await supabase.storage
        .from("interaction-attachments")
        .upload(filepath, file);

      if (uploadError) throw uploadError;
      if (data) {
        uploadedPaths.push(data.path);
      }
    } catch (err) {
      console.error(`Failed to upload file ${file.name}:`, err);
    }
  }

  return uploadedPaths;
};
