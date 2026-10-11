import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError } from "@/lib/admin/auth";
import { deployStatus, GitHubError } from "@/lib/admin/github";

export const dynamic = "force-dynamic";

/** Has Vercel finished deploying commit `sha`? Polled by the admin page after a save. */
export async function GET(req: NextRequest) {
  const setup = guard(req, { mutating: false });
  if (setup instanceof Response) return setup;

  const sha = req.nextUrl.searchParams.get("sha") ?? "";
  if (!/^[0-9a-f]{40}$/.test(sha)) return jsonError(400, "Invalid commit.");
  try {
    return NextResponse.json(await deployStatus(setup.github, sha));
  } catch (e) {
    if (e instanceof GitHubError) return jsonError(502, e.message);
    throw e;
  }
}
