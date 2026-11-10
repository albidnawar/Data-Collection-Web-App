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
 * Reads an image file's displayed (EXIF-orientation-corrected) dimensions
 * without fully decoding its pixels into memory — an <img> element only
 * needs to parse the header to know its natural size, unlike
 * createImageBitmap, which must allocate and decode the full bitmap.
 */
function probeImageSize(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read image dimensions"));
    };
    img.src = url;
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
  let width: number;
  let height: number;
  try {
    const size = await probeImageSize(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(size.width, size.height, 1));
    width = Math.max(1, Math.round(size.width * scale));
    height = Math.max(1, Math.round(size.height * scale));
  } catch {
    throw new Error(DECODE_FAILURE_MESSAGE);
  }

  let bitmap: ImageBitmap;
  try {
    // Decoding straight to the target size — instead of decoding at the
    // camera's full resolution and shrinking afterward — keeps the decoded
    // bitmap small. Phone cameras can shoot 12-108MP; fully decoding that
    // into memory before resizing is what was triggering Chrome's "low
    // memory" failure on phones without much RAM to spare.
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
    });
  } catch {
    throw new Error(DECODE_FAILURE_MESSAGE);
  }

  try {
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
