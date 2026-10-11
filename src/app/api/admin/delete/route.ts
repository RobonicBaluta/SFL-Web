import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError } from "@/lib/admin/auth";
import { commitChanges, GitHubError, readEvents } from "@/lib/admin/github";

export const dynamic = "force-dynamic";

/** Remove an event folder (text files and photos) in one commit. */
export async function POST(req: NextRequest) {
  const setup = guard(req, { mutating: true });
  if (setup instanceof Response) return setup;

  const { slug } = (await req.json().catch(() => ({}))) as { slug?: unknown };
  try {
    const event = (await readEvents(setup.github)).find((e) => e.slug === slug);
    if (!event) return jsonError(404, "This event no longer exists.");
    const sha = await commitChanges(
      setup.github,
      `admin: delete event ${event.slug}`,
      event.paths.map((path) => ({ path, sha: null }))
    );
    return NextResponse.json({ sha });
  } catch (e) {
    if (e instanceof GitHubError) return jsonError(502, e.message);
    throw e;
  }
}
