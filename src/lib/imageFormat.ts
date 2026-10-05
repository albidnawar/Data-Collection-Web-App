/**
 * Minimal magic-byte sniffer — only needs to tell real JPEG apart from HEIC
 * bytes mislabeled with a .jpg name (the one failure mode the admin
 * "Fix corrupted photos" tool repairs). Anything else is reported as
 * "unknown" and left untouched rather than guessed at.
 */
export function sniffImageFormat(buffer: Buffer): "jpeg" | "heic" | "unknown" {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12);
    const heicBrands = ["heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"];
    if (heicBrands.includes(brand)) return "heic";
  }

  return "unknown";
}
