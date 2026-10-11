import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  passwordMatches,
  passwordProblem,
  verifySessionToken
} from "@/lib/admin/session";

const PW = "correct horse battery";
const NOW = Date.UTC(2026, 9, 11, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

describe("session tokens", () => {
  it("are valid for 30 days and not after", () => {
    const token = createSessionToken(PW, NOW);
    expect(verifySessionToken(token, PW, NOW + 29 * DAY)).toBe(true);
    expect(verifySessionToken(token, PW, NOW + 31 * DAY)).toBe(false);
  });

  it("stop working when the password changes", () => {
    const token = createSessionToken(PW, NOW);
    expect(verifySessionToken(token, "another long password", NOW)).toBe(false);
  });

  it("cannot be extended by editing the expiry", () => {
    const [, mac] = createSessionToken(PW, NOW).split(".");
    const forged = `${NOW + 365 * DAY}.${mac}`;
    expect(verifySessionToken(forged, PW, NOW + 31 * DAY)).toBe(false);
  });

  it("reject missing and malformed values", () => {
    for (const bad of [undefined, "", "abc", "1.2.3", ".", `${NOW + DAY}.`]) {
      expect(verifySessionToken(bad, PW, NOW), String(bad)).toBe(false);
    }
  });
});

describe("passwordMatches", () => {
  it("accepts only the exact password", () => {
    expect(passwordMatches(PW, PW)).toBe(true);
    expect(passwordMatches("correct horse battery ", PW)).toBe(false);
    expect(passwordMatches("", PW)).toBe(false);
  });
});

describe("passwordProblem", () => {
  it("explains a missing or short ADMIN_PASSWORD", () => {
    expect(passwordProblem(undefined)).toMatch(/ADMIN_PASSWORD is not set/);
    expect(passwordProblem("short")).toMatch(/at least 12 characters/);
    expect(passwordProblem("twelve chars")).toBeNull();
  });
});
