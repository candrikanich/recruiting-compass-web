import { useSupabase } from "./useSupabase";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useAttachments");

export const useAttachments = () => {
  const supabase = useSupabase();

  const getDownloadUrl = (filepath: string): string => {
    const { data } = supabase.storage
      .from("interaction-attachments")
      .getPublicUrl(filepath);
    return data.publicUrl;
  };

  const downloadAttachment = async (filepath: string, filename?: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("interaction-attachments")
        .download(filepath);

      if (error) throw error;

      // Create blob and download
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || filepath.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error("Failed to download attachment:", err);
    }
  };

  const deleteAttachment = async (filepath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from("interaction-attachments")
        .remove([filepath]);

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error("Failed to delete attachment:", err);
      return false;
    }
  };

  return {
    getDownloadUrl,
    downloadAttachment,
    deleteAttachment,
  };
};
