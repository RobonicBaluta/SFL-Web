import { NextResponse, type NextRequest } from "next/server";
import { adminSetup, jsonError, sameOrigin } from "@/lib/admin/auth";
import {
  createSessionToken,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS
} from "@/lib/admin/session";

export const dynamic = "force-dynamic";

/** Slows down guessing; one owner never notices it. */
const WRONG_PASSWORD_DELAY_MS = 1000;

export async function POST(req: NextRequest) {
  const setup = adminSetup();
  if (setup.problems.length > 0) return jsonError(503, setup.problems.join(" "));
  if (!sameOrigin(req)) return jsonError(403, "Cross-site request refused.");

  const { password } = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (typeof password !== "string" || !passwordMatches(password, setup.password)) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
    return jsonError(401, "Wrong password.");
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(setup.password, Date.now()), {
    httpOnly: true,
    sameSite: "strict",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000
  });
  return res;
}
