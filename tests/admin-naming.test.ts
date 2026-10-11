import { describe, expect, it } from "vitest";
import { eventSlug, photoName } from "@/lib/admin/naming";

describe("eventSlug", () => {
  it("builds YYYY-MM-title from the date and the Romanian title", () => {
    expect(eventSlug("2026-10-13", "Chat Control: o discuție")).toBe(
      "2026-10-chat-control-o-discutie"
    );
  });

  it("strips every Romanian diacritic, comma-below and cedilla forms alike", () => {
    expect(eventSlug("2026-01-01", "Țară Știință ăâî ţş")).toBe("2026-01-tara-stiinta-aai-ts");
  });

  it("caps the title part at 60 characters without a trailing dash", () => {
    const slug = eventSlug("2026-01-01", "a".repeat(59) + " bbbb");
    expect(slug).toBe("2026-01-" + "a".repeat(59));
  });

  it("falls back to 'eveniment' when the title has no usable characters", () => {
    expect(eventSlug("2026-01-01", "!!!")).toBe("2026-01-eveniment");
  });

  it("returns an empty string until a date is chosen", () => {
    expect(eventSlug("", "Chat Control")).toBe("");
  });
});

describe("photoName", () => {
  it("sanitizes the original name and always ends in .jpg", () => {
    expect(photoName("IMG_3251 Copy.HEIC", [])).toBe("img-3251-copy.jpg");
  });

  it("adds -2, -3 when the name is already taken", () => {
    expect(photoName("poza.png", ["poza.jpg"])).toBe("poza-2.jpg");
    expect(photoName("poza.png", ["poza.jpg", "poza-2.jpg"])).toBe("poza-3.jpg");
  });

  it("falls back to 'foto' for names without usable characters", () => {
    expect(photoName("📸.jpg", [])).toBe("foto.jpg");
  });
});
