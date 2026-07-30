import { describe, expect, it } from "vitest";
import { formatEventDate } from "@/lib/dates";

describe("formatEventDate", () => {
  it("formats a single date in Romanian", () => {
    expect(formatEventDate("ro", "2025-12-13")).toBe("13 decembrie 2025");
  });

  it("formats a single date in English", () => {
    expect(formatEventDate("en", "2025-12-13")).toBe("December 13, 2025");
  });

  it("formats a range within the same month", () => {
    const s = formatEventDate("ro", "2026-04-24", "2026-04-26");
    expect(s).toContain("24");
    expect(s).toContain("26");
    expect(s).toContain("aprilie 2026");
  });

  it("formats a range across months", () => {
    const s = formatEventDate("en", "2026-02-01", "2026-05-31");
    expect(s).toContain("February");
    expect(s).toContain("May");
    expect(s).toContain("2026");
  });
});
