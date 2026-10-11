import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError } from "@/lib/admin/auth";
import { GitHubError, readRaw, uploadBlob } from "@/lib/admin/github";
import { SLUG_PATTERN } from "@/lib/admin/save";
import { IMAGE_EXT } from "@/lib/events";

export const dynamic = "force-dynamic";

/** The browser resizes photos well below this; Vercel refuses bodies over 4.5 MB anyway. */
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/** Upload one resized JPEG; returns the blob sha the save request will reference. */
export async function POST(req: NextRequest) {
  const setup = guard(req, { mutating: true });
  if (setup instanceof Response) return setup;

  const { data } = (await req.json().catch(() => ({}))) as { data?: unknown };
  if (typeof data !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    return jsonError(400, "The photo didn't arrive. Try adding it again.");
  }
  const bytes = Buffer.from(data, "base64");
  if (bytes.length > MAX_PHOTO_BYTES) return jsonError(413, "The photo is too large.");
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return jsonError(400, "Only JPEG photos can be uploaded.");
  }

  try {
    return NextResponse.json({ sha: await uploadBlob(setup.github, data) });
  } catch (e) {
    if (e instanceof GitHubError) return jsonError(502, e.message);
    throw e;
  }
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

/** A photo straight from GitHub, so thumbnails work before the deploy finishes. */
export async function GET(req: NextRequest) {
  const setup = guard(req, { mutating: false });
  if (setup instanceof Response) return setup;

  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const name = req.nextUrl.searchParams.get("name") ?? "";
  if (!SLUG_PATTERN.test(slug) || !IMAGE_EXT.test(name) || /[\\/]|\.\./.test(name)) {
    return jsonError(400, "Invalid photo.");
  }

  try {
    const bytes = await readRaw(setup.github, `content/events/${slug}/images/${name}`);
    const ext = name.split(".").pop()!.toLowerCase();
    return new Response(bytes, {
      headers: { "content-type": CONTENT_TYPES[ext], "cache-control": "private, max-age=300" }
    });
  } catch (e) {
    if (e instanceof GitHubError) return jsonError(502, e.message);
    throw e;
  }
}
