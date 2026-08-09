import fs from "node:fs";
import path from "node:path";

/** Copies a flat directory of images into dest, returning how many were copied. */
function copyFlat(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const f of fs.readdirSync(src)) {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
    count++;
  }
  return count;
}

function syncEvents() {
  const src = path.join(process.cwd(), "content", "events");
  const dest = path.join(process.cwd(), "public", "events");
  fs.rmSync(dest, { recursive: true, force: true });
  if (!fs.existsSync(src)) {
    console.log("sync-event-images: no content/events directory, nothing to do");
    return;
  }
  let count = 0;
  for (const dir of fs.readdirSync(src)) {
    if (dir.startsWith("_")) continue;
    const imgDir = path.join(src, dir, "images");
    if (!fs.existsSync(imgDir)) continue;
    fs.mkdirSync(path.join(dest, dir), { recursive: true });
    for (const f of fs.readdirSync(imgDir)) {
      fs.copyFileSync(path.join(imgDir, f), path.join(dest, dir, f));
      count++;
    }
  }
  console.log(`sync-event-images: copied ${count} images to public/events`);
}

/** Instagram tiles use the same "commit the image, serve it locally" approach as events. */
function syncInstagram() {
  const count = copyFlat(
    path.join(process.cwd(), "content", "instagram", "images"),
    path.join(process.cwd(), "public", "instagram")
  );
  console.log(`sync-event-images: copied ${count} images to public/instagram`);
}

syncEvents();
syncInstagram();
