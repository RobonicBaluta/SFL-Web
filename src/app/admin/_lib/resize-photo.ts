// Browser only. Phone photos (2–6 MB) exceed Vercel's 4.5 MB request limit and
// would bloat the repository, so every photo is re-encoded before upload.

const MAX_EDGE = 2400;
/** Stays under the 4.5 MB request limit after base64 (+33%) and JSON overhead. */
const MAX_BYTES = 2.8 * 1024 * 1024;
const QUALITIES = [0.85, 0.7, 0.5];

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** JPEG, longest side at most 2400 px, upright; plus a local URL for the thumbnail. */
export async function resizePhoto(file: File): Promise<{ base64: string; preview: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`${file.name}: this file can't be opened as a photo. Use a JPEG or PNG.`);
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  // Transparent PNG areas would turn black in a JPEG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob: Blob | null = null;
  for (const quality of QUALITIES) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_BYTES) break;
  }
  if (!blob || blob.size > MAX_BYTES) throw new Error(`${file.name}: too large even after resizing.`);
  return { base64: await toBase64(blob), preview: URL.createObjectURL(blob) };
}
