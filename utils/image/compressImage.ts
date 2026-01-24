import imageCompression from "browser-image-compression";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_COMPRESSED_SIZE_MB = 0.5; // 500KB
const DEFAULT_MAX_DIMENSION = 800;

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

export const validateImageFile = (
  file: File,
  maxSizeMB: number = DEFAULT_MAX_SIZE_MB
): ImageValidationResult => {
  if (!file || file.size === 0) {
    return {
      isValid: false,
      error: "File is empty",
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: image/jpeg, image/png, image/webp, image/gif`,
    };
  }

  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return {
      isValid: false,
      error: `File exceeds ${maxSizeMB}MB limit. Current size: ${fileSizeMB.toFixed(2)}MB`,
    };
  }

  return {
    isValid: true,
  };
};

export const compressImage = async (
  file: File,
  options?: CompressionOptions
): Promise<File> => {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid image file");
  }

  const compressionOptions = {
    maxSizeMB: options?.maxSizeMB ?? DEFAULT_COMPRESSED_SIZE_MB,
    maxWidthOrHeight: options?.maxWidthOrHeight ?? DEFAULT_MAX_DIMENSION,
    useWebWorker: options?.useWebWorker ?? true,
    fileType: "image/jpeg" as const,
  };

  try {
    const compressedBlob = await imageCompression(file, compressionOptions);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = ".jpg"; // Always output as JPEG
    const fileName = `${file.name.replace(/\.[^/.]+$/, "")}-${timestamp}${fileExtension}`;

    // Create a new File from the compressed Blob
    const compressedFile = new File([compressedBlob], fileName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    return compressedFile;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to compress image";
    throw new Error(`Image compression failed: ${errorMessage}`);
  }
};
