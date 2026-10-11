import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as deletePOST } from "@/app/api/admin/delete/route";
import { GET as deployGET } from "@/app/api/admin/deploy/route";
import { POST as loginPOST } from "@/app/api/admin/login/route";
import { POST as logoutPOST } from "@/app/api/admin/logout/route";
import { GET as photoGET, POST as photoPOST } from "@/app/api/admin/photo/route";
import { POST as savePOST } from "@/app/api/admin/save/route";
import { createSessionToken, SESSION_COOKIE } from "@/lib/admin/session";

// Every route must refuse before touching GitHub; an unreachable API URL makes
// any accidental call fail loudly instead of reaching the network.
const PASSWORD = "route test password";
const saved = { ...process.env };
beforeAll(() => {
  process.env.ADMIN_PASSWORD = PASSWORD;
  process.env.GITHUB_TOKEN = "token";
  process.env.GITHUB_API_URL = "http://127.0.0.1:9";
});
afterAll(() => {
  process.env = saved;
});

const SITE = "https://sfl-romania.vercel.app";
function request(path: string, { method = "POST", origin = SITE, loggedIn = true } = {}) {
  const headers: Record<string, string> = { host: "sfl-romania.vercel.app", "content-type": "application/json" };
  if (origin) headers.origin = origin;
  if (loggedIn) headers.cookie = `${SESSION_COOKIE}=${createSessionToken(PASSWORD, Date.now())}`;
  return new NextRequest(`${SITE}${path}`, { method, headers, body: method === "POST" ? "{}" : undefined });
}

const MUTATING = [
  ["save", savePOST],
  ["delete", deletePOST],
  ["photo", photoPOST]
] as const;

describe("admin API routes", () => {
  for (const [name, handler] of MUTATING) {
    it(`${name} refuses a logged-in request coming from another site`, async () => {
      const res = await handler(request(`/api/admin/${name}`, { origin: "https://evil.example" }));
      expect(res.status).toBe(403);
    });

    it(`${name} refuses a request without a login`, async () => {
      const res = await handler(request(`/api/admin/${name}`, { loggedIn: false }));
      expect(res.status).toBe(401);
    });
  }

  it("reading photos and deploy status needs a login", async () => {
    const photo = await photoGET(request("/api/admin/photo?slug=2026-10-x&name=a.jpg", { method: "GET", loggedIn: false }));
    const deploy = await deployGET(request(`/api/admin/deploy?sha=${"a".repeat(40)}`, { method: "GET", loggedIn: false }));
    expect([photo.status, deploy.status]).toEqual([401, 401]);
  });

  it("login and logout refuse requests from another site", async () => {
    const login = await loginPOST(request("/api/admin/login", { origin: "https://evil.example", loggedIn: false }));
    const logout = await logoutPOST(request("/api/admin/logout", { origin: "https://evil.example" }));
    expect([login.status, logout.status]).toEqual([403, 403]);
  });
});
