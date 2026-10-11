import { describe, expect, it } from "vitest";
import { mdxProblem } from "@/lib/mdx-check";

describe("mdxProblem", () => {
  it("accepts the markdown the event bodies use", async () => {
    const body = "Un **eveniment** cu [link](https://sfl.ro).\n\n- unu\n- doi";
    expect(await mdxProblem(body)).toBeNull();
  });

  it("names the line of a stray brace", async () => {
    const body = "Primul paragraf.\n\nAl doilea.\n\nTaxa {15 euro} pe zi.";
    expect(await mdxProblem(body)).toMatch(/^line 5: /);
  });

  it("rejects a line that starts with a lowercase import", async () => {
    expect(await mdxProblem("import de bunuri")).toMatch(/^line 1: /);
  });
});
