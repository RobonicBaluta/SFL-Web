import { describe, expect, it } from "vitest";
import { matchRoute } from "@/i18n/match-route";

describe("matchRoute", () => {
  it("matches the home route", () => {
    expect(matchRoute("/")).toEqual({ pathname: "/" });
  });

  it("matches static routes", () => {
    expect(matchRoute("/evenimente")).toEqual({ pathname: "/evenimente" });
    expect(matchRoute("/despre-noi")).toEqual({ pathname: "/despre-noi" });
    expect(matchRoute("/implica-te")).toEqual({ pathname: "/implica-te" });
  });

  it("matches localized pathnames back to the internal route key", () => {
    expect(matchRoute("/events")).toEqual({ pathname: "/evenimente" });
    expect(matchRoute("/about")).toEqual({ pathname: "/despre-noi" });
    expect(matchRoute("/get-involved")).toEqual({ pathname: "/implica-te" });
  });

  it("extracts the slug from a concrete event pathname", () => {
    expect(matchRoute("/evenimente/abc")).toEqual({
      pathname: "/evenimente/[slug]",
      params: { slug: "abc" }
    });
    expect(matchRoute("/events/2026-04-lrr-bucuresti")).toEqual({
      pathname: "/evenimente/[slug]",
      params: { slug: "2026-04-lrr-bucuresti" }
    });
  });

  it("resolves a route template using the route params", () => {
    // `usePathname()` returns the template on routes the middleware did not rewrite.
    expect(matchRoute("/evenimente/[slug]", { locale: "ro", slug: "abc" })).toEqual({
      pathname: "/evenimente/[slug]",
      params: { slug: "abc" }
    });
  });

  it("prefers the route params over the pathname segment", () => {
    expect(matchRoute("/evenimente/stale", { slug: "fresh" })).toEqual({
      pathname: "/evenimente/[slug]",
      params: { slug: "fresh" }
    });
  });

  it("tolerates a trailing slash", () => {
    expect(matchRoute("/evenimente/")).toEqual({ pathname: "/evenimente" });
  });

  it("falls back to home for unknown or unresolvable paths", () => {
    expect(matchRoute("/nu-exista")).toEqual({ pathname: "/" });
    expect(matchRoute("/evenimente/abc/extra")).toEqual({ pathname: "/" });
    expect(matchRoute("")).toEqual({ pathname: "/" });
    // A template with no params to fill it in cannot produce a usable href.
    expect(matchRoute("/evenimente/[slug]")).toEqual({ pathname: "/" });
  });
});
