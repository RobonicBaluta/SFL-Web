import { describe, expect, it } from "vitest";
import { decodeBody, encodeBody } from "@/lib/admin/text";
import { mdxProblem } from "@/lib/mdx-check";

describe("encodeBody", () => {
  it("turns braces and < into character references", () => {
    expect(encodeBody("Taxa {15 euro}, copii <12 ani")).toBe(
      "Taxa &#123;15 euro&#125;, copii &lt;12 ani"
    );
  });

  it("disarms import/export only at the start of a line", () => {
    expect(encodeBody("import de bunuri\nși export\n  export de idei")).toBe(
      "&#105;mport de bunuri\nși export\n  &#101;xport de idei"
    );
  });

  it("normalizes Windows line endings", () => {
    expect(encodeBody("a\r\nb")).toBe("a\nb");
  });

  it("produces text that compiles as MDX", async () => {
    const nasty = "Taxa {15 euro}.\n\n<!-- notă -->\n\nimport de idei <3\n\n- {a}\n- b";
    expect(await mdxProblem(encodeBody(nasty))).toBeNull();
  });
});

describe("decodeBody", () => {
  it("restores exactly what encodeBody changed", () => {
    expect(decodeBody("Taxa &#123;15 euro&#125;, copii &lt;12 ani")).toBe(
      "Taxa {15 euro}, copii <12 ani"
    );
    expect(decodeBody("&#105;mport de bunuri\n  &#101;xport de idei")).toBe(
      "import de bunuri\n  export de idei"
    );
  });
});
