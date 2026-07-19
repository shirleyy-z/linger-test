const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.82;

// Uploads go straight from the browser to Supabase Storage — there's no server hop to run sharp
// on, so this has to happen client-side with Canvas. Always falls back to the original file on
// any failure or unsupported format: a missed optimization should never block saving a memory.
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // PNGs may carry transparency; re-encoding those as JPEG would flatten it to a solid
    // background, so PNG stays PNG (still gets the dimension resize). Everything else
    // (JPEG, WebP, HEIC, ...) normalizes to JPEG for the best size/quality tradeoff.
    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, outputType === "image/jpeg" ? JPEG_QUALITY : undefined)
    );
    if (!blob || blob.size >= file.size) return file;

    const needsExtensionSwap = outputType === "image/jpeg" && !/\.(jpe?g)$/i.test(file.name);
    const name = needsExtensionSwap ? `${file.name.replace(/\.[^.]+$/, "")}.jpg` : file.name;
    return new File([blob], name, { type: outputType, lastModified: file.lastModified });
  } catch {
    return file;
  }
}
