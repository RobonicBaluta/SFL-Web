import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { siteConfig } from "@/site.config";
import type { GitHubConfig } from "./github";
import { passwordProblem, SESSION_COOKIE, verifySessionToken } from "./session";

// Server only: Next.js glue between the environment, the session cookie and the routes.

type Env = Record<string, string | undefined>;

export type AdminSetup = { problems: string[]; password: string; github: GitHubConfig };

/** Reads ADMIN_PASSWORD / GITHUB_TOKEN (set in Vercel) and lists what is missing. */
export function adminSetup(env: Env = process.env): AdminSetup {
  const password = env.ADMIN_PASSWORD ?? "";
  const token = env.GITHUB_TOKEN ?? "";
  const problems: string[] = [];
  const pwProblem = passwordProblem(password);
  if (pwProblem) problems.push(pwProblem);
  if (!token) problems.push("GITHUB_TOKEN is not set.");
  const { owner, name, branch } = siteConfig.repository;
  return {
    problems,
    password,
    github: {
      owner,
      repo: name,
      branch,
      token,
      apiUrl: (env.GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "")
    }
  };
}

/** True when the browser sent the request from a page on this same site (CSRF guard). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** For server components: is this browser logged in? */
export async function isLoggedIn(): Promise<boolean> {
  const setup = adminSetup();
  if (setup.problems.length > 0) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, setup.password, Date.now());
}

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * For route handlers: the setup when the request may proceed, otherwise the
 * response to send. Mutating requests must also come from this site.
 */
export function guard(req: NextRequest, { mutating }: { mutating: boolean }): AdminSetup | Response {
  const setup = adminSetup();
  if (setup.problems.length > 0) return jsonError(503, setup.problems.join(" "));
  if (mutating && !sameOrigin(req)) return jsonError(403, "Cross-site request refused.");
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token, setup.password, Date.now())) {
    return jsonError(401, "Your login expired. Reload the page and log in again.");
  }
  return setup;
}
