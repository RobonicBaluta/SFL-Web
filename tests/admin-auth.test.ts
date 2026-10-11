import { describe, expect, it } from "vitest";
import { adminSetup, sameOrigin } from "@/lib/admin/auth";

const req = (headers: Record<string, string>) =>
  new Request("http://internal/api/admin/save", { method: "POST", headers });

describe("sameOrigin", () => {
  it("accepts a request from the admin page itself", () => {
    expect(sameOrigin(req({ origin: "https://sfl-romania.vercel.app", host: "sfl-romania.vercel.app" }))).toBe(true);
  });

  it("uses the forwarded host behind a proxy", () => {
    expect(
      sameOrigin(req({ origin: "https://sfl.ro", host: "internal:3000", "x-forwarded-host": "sfl.ro" }))
    ).toBe(true);
  });

  it("rejects other sites and requests without an Origin", () => {
    expect(sameOrigin(req({ origin: "https://evil.example", host: "sfl-romania.vercel.app" }))).toBe(false);
    expect(sameOrigin(req({ host: "sfl-romania.vercel.app" }))).toBe(false);
    expect(sameOrigin(req({ origin: "null", host: "sfl-romania.vercel.app" }))).toBe(false);
  });
});

describe("adminSetup", () => {
  it("lists every missing setting", () => {
    expect(adminSetup({}).problems).toEqual([
      "ADMIN_PASSWORD is not set.",
      "GITHUB_TOKEN is not set."
    ]);
  });

  it("builds the GitHub config from the site's repository and the token", () => {
    const setup = adminSetup({ ADMIN_PASSWORD: "a long password", GITHUB_TOKEN: "ghp_x" });
    expect(setup.problems).toEqual([]);
    expect(setup.github).toEqual({
      owner: "RobonicBaluta",
      repo: "SFL-Web",
      branch: "main",
      token: "ghp_x",
      apiUrl: "https://api.github.com"
    });
  });

  it("lets a local fake GitHub replace the API URL", () => {
    const setup = adminSetup({
      ADMIN_PASSWORD: "a long password",
      GITHUB_TOKEN: "x",
      GITHUB_API_URL: "http://localhost:4010/"
    });
    expect(setup.github.apiUrl).toBe("http://localhost:4010");
  });
});
