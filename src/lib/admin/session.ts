import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "sfl_admin";
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 12;

/** Why ADMIN_PASSWORD can't be used, or null when it can. */
export function passwordProblem(password: string | undefined): string | null {
  if (!password) return "ADMIN_PASSWORD is not set.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest();

/** Constant-time comparison (digests make the lengths equal). */
export function passwordMatches(input: string, password: string): boolean {
  return timingSafeEqual(sha256(input), sha256(password));
}

// Keyed with the password itself, so changing ADMIN_PASSWORD logs out every device.
const mac = (password: string, expires: string) =>
  createHmac("sha256", password).update(`sfl-admin:${expires}`).digest("hex");

export function createSessionToken(password: string, now: number): string {
  const expires = String(now + SESSION_MAX_AGE_MS);
  return `${expires}.${mac(password, expires)}`;
}

export function verifySessionToken(
  token: string | undefined,
  password: string,
  now: number
): boolean {
  const match = /^(\d+)\.([0-9a-f]{64})$/.exec(token ?? "");
  if (!match) return false;
  const [, expires, given] = match;
  if (Number(expires) <= now) return false;
  return timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(mac(password, expires), "hex"));
}
