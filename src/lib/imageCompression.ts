const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // stay safely under Vercel's 4.5MB request body limit
const MAX_DIMENSION = 1920; // 1080p-equivalent long edge
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Returns the original file unchanged if it's already under the size limit.
 * Otherwise resizes to a 1920px-long-edge JPEG and reduces quality until it
 * fits, so a large camera photo never hits Vercel's request body ceiling.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = INITIAL_QUALITY;
  let blob = await canvasToJpegBlob(canvas, quality);

  while (blob.size > MAX_UPLOAD_BYTES && quality > MIN_QUALITY) {
    quality -= QUALITY_STEP;
    blob = await canvasToJpegBlob(canvas, quality);
  }

  const jpegName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], jpegName, { type: "image/jpeg" });
}
