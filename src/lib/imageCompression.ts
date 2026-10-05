const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // stay safely under Vercel's 4.5MB request body limit
const MAX_DIMENSION = 1920; // 1080p-equivalent long edge
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;

const DECODE_FAILURE_MESSAGE = "This photo couldn't be opened. Please retake it or choose a different one.";

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
 * Unconditionally decodes the captured file and re-encodes it through canvas
 * as a baseline JPEG, resizing to a 1920px long edge only if it's larger than
 * that. This guarantees every uploaded file really is valid JPEG data —
 * iPhones can hand the browser a file named/labeled .jpg whose actual bytes
 * are HEIC (or carry HDR gain maps / wide-gamut profiles some viewers can't
 * read), and a canvas round-trip normalizes all of that away regardless of
 * file size. Throws if the file can't be decoded as an image at all.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(DECODE_FAILURE_MESSAGE);
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = INITIAL_QUALITY;
    let blob = await canvasToJpegBlob(canvas, quality);

    while (blob.size > MAX_UPLOAD_BYTES && quality > MIN_QUALITY) {
      quality -= QUALITY_STEP;
      blob = await canvasToJpegBlob(canvas, quality);
    }

    const jpegName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], jpegName, { type: "image/jpeg" });
  } catch {
    throw new Error(DECODE_FAILURE_MESSAGE);
  } finally {
    bitmap.close();
  }
}
