import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError } from "@/lib/admin/auth";
import { commitChanges, GitHubError, readEvents } from "@/lib/admin/github";
import { filesFromDraft } from "@/lib/admin/draft";
import { checkSave, eventVersion, saveChanges, savePayloadSchema } from "@/lib/admin/save";
import { KNOWN_TAG_KEYS } from "@/lib/admin/tags";

export const dynamic = "force-dynamic";

/** Create or update one event in a single commit; Vercel deploys it. */
export async function POST(req: NextRequest) {
  const setup = guard(req, { mutating: true });
  if (setup instanceof Response) return setup;

  const parsed = savePayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { errors: [`Invalid form data (${issue.path.join(".")}: ${issue.message}).`] },
      { status: 400 }
    );
  }
  const payload = parsed.data;

  try {
    const existing = await readEvents(setup.github);
    const problems = await checkSave(payload, { existing, knownTags: KNOWN_TAG_KEYS });
    if (problems.length > 0) return NextResponse.json({ errors: problems }, { status: 400 });

    const current = existing.find((e) => e.slug === payload.draft.slug);
    const changes = saveChanges(payload, payload.mode === "edit" ? (current?.images ?? []) : []);
    const verb = payload.mode === "create" ? "add" : "update";
    const title = payload.draft.ro.title.trim().replace(/\s+/g, " ");
    const sha = await commitChanges(setup.github, `admin: ${verb} event "${title}"`, changes);
    // What the next readEvents will see, so the open form can keep saving.
    const version = eventVersion(filesFromDraft(payload.draft), payload.draft.images);
    return NextResponse.json({ sha, slug: payload.draft.slug, version });
  } catch (e) {
    if (e instanceof GitHubError) return jsonError(502, e.message);
    throw e;
  }
}
