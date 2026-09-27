export interface PreparedImage {
  compressed: boolean;
  file: File;
  finalSize: number;
  originalSize: number;
}

const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_MAX_DIMENSION = 1920;
const DEFAULT_QUALITY = 0.82;

export interface PrepareImageOptions {
  maxDimension?: number;
  outputType?: string;
  quality?: number;
}

/**
 * Kompresi di browser: WebP q0.82 maks 1920 px; file asli dipakai bila hasil
 * tidak lebih kecil atau tipe bukan jpeg/png/webp (paritas legacy, FE-M01).
 */
export async function prepareImageForUpload(
  file: File,
  options: PrepareImageOptions = {},
): Promise<PreparedImage> {
  const originalSize = file.size;
  const asIs: PreparedImage = { compressed: false, file, finalSize: originalSize, originalSize };
  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    outputType = "image/webp",
    quality = DEFAULT_QUALITY,
  } = options;
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type)) return asIs;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return asIs;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return asIs;
  }
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return asIs;
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), outputType, quality),
    );
    if (!blob || blob.size >= file.size) return asIs;
    return {
      compressed: true,
      file: new File([blob], file.name, {
        lastModified: file.lastModified,
        type: blob.type || outputType,
      }),
      finalSize: blob.size,
      originalSize,
    };
  } finally {
    bitmap.close();
  }
}
