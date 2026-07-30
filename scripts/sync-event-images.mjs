import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "content", "events");
const DEST = path.join(process.cwd(), "public", "events");

fs.rmSync(DEST, { recursive: true, force: true });
if (!fs.existsSync(SRC)) {
  console.log("sync-event-images: no content/events directory, nothing to do");
  process.exit(0);
}
let count = 0;
for (const dir of fs.readdirSync(SRC)) {
  if (dir.startsWith("_")) continue;
  const imgDir = path.join(SRC, dir, "images");
  if (!fs.existsSync(imgDir)) continue;
  fs.mkdirSync(path.join(DEST, dir), { recursive: true });
  for (const f of fs.readdirSync(imgDir)) {
    fs.copyFileSync(path.join(imgDir, f), path.join(DEST, dir, f));
    count++;
  }
}
console.log(`sync-event-images: copied ${count} images to public/events`);
