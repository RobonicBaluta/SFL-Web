import { describe, expect, it } from "vitest";
import { commitChanges, deployStatus, readEvents, uploadBlob } from "@/lib/admin/github";
import { fakeGitHub } from "./helpers/fake-github";

const CHANGES = [
  { path: "content/events/e/event.json", content: "{}\n" },
  { path: "content/events/e/images/a.jpg", sha: "b".repeat(40) },
  { path: "content/events/e/images/old.jpg", sha: null }
];

describe("commitChanges", () => {
  it("commits on top of main's tree and moves main to the new commit", async () => {
    const gh = fakeGitHub();
    const sha = await commitChanges(gh.config, "admin: add event", CHANGES);

    expect(gh.trees).toEqual([
      {
        base_tree: gh.initialTree,
        tree: [
          { path: "content/events/e/event.json", mode: "100644", type: "blob", content: "{}\n" },
          { path: "content/events/e/images/a.jpg", mode: "100644", type: "blob", sha: "b".repeat(40) },
          { path: "content/events/e/images/old.jpg", mode: "100644", type: "blob", sha: null }
        ]
      }
    ]);
    expect(gh.commit(sha)?.parents).toEqual([gh.initialHead]);
    expect(gh.head()).toBe(sha);
  });

  it("sends the token on every request", async () => {
    const gh = fakeGitHub();
    await commitChanges(gh.config, "m", CHANGES);
    for (const call of gh.calls) expect(call.headers.get("authorization")).toBe("Bearer tok");
  });

  it("rebuilds on the new head when someone pushed in between", async () => {
    const gh = fakeGitHub();
    gh.pushConcurrently(1);
    const sha = await commitChanges(gh.config, "m", CHANGES);

    expect(gh.head()).toBe(sha);
    const otherPush = gh.commit(sha)!.parents[0];
    expect(otherPush).not.toBe(gh.initialHead);
    expect(gh.commit(otherPush)?.parents).toEqual([gh.initialHead]);
  });

  it("gives up after three rejected attempts", async () => {
    const gh = fakeGitHub();
    gh.pushConcurrently(99);
    await expect(commitChanges(gh.config, "m", CHANGES)).rejects.toThrow(/try saving again/i);
    expect(gh.calls.filter((c) => c.method === "PATCH")).toHaveLength(3);
  });

  it("explains a rejected token", async () => {
    const gh = fakeGitHub({ status: 401 });
    await expect(commitChanges(gh.config, "m", CHANGES)).rejects.toThrow(/GITHUB_TOKEN/);
  });

  it("explains a repository the token cannot see", async () => {
    const gh = fakeGitHub({ status: 404 });
    await expect(commitChanges(gh.config, "m", CHANGES)).rejects.toThrow(/o\/r/);
  });
});

describe("uploadBlob", () => {
  it("stores base64 data and returns the blob sha", async () => {
    const gh = fakeGitHub();
    const sha = await uploadBlob(gh.config, "/9j/4AAQ");
    expect(sha).toMatch(/^blob/);
    expect(gh.calls.at(-1)?.body).toEqual({ content: "/9j/4AAQ", encoding: "base64" });
  });
});

const tree = (entries: unknown[]) => ({ entries });
const blob = (name: string, text: string | null = null) => ({ name, type: "blob", object: { text } });
const folder = (name: string, entries: unknown[]) => ({ name, type: "tree", object: tree(entries) });

describe("readEvents", () => {
  it("returns each event's text files, photos and every path, skipping _ folders", async () => {
    const gh = fakeGitHub({
      graphql: {
        data: {
          repository: {
            object: tree([
              folder("_TEMPLATE", [blob("event.json", "{}")]),
              blob("README.md", "x"),
              folder("2026-10-chat-control", [
                blob("en.mdx", "EN"),
                blob("event.json", '{"slug":1}'),
                folder("images", [
                  { name: "z.jpg", type: "blob" },
                  { name: "Afis Mare.JPEG", type: "blob" },
                  { name: ".gitkeep", type: "blob" }
                ]),
                blob("ro.mdx", "RO")
              ])
            ])
          }
        }
      }
    });

    expect(await readEvents(gh.config)).toEqual([
      {
        slug: "2026-10-chat-control",
        files: { eventJson: '{"slug":1}', roMdx: "RO", enMdx: "EN" },
        images: ["Afis Mare.JPEG", "z.jpg"],
        paths: [
          "content/events/2026-10-chat-control/en.mdx",
          "content/events/2026-10-chat-control/event.json",
          "content/events/2026-10-chat-control/images/z.jpg",
          "content/events/2026-10-chat-control/images/Afis Mare.JPEG",
          "content/events/2026-10-chat-control/images/.gitkeep",
          "content/events/2026-10-chat-control/ro.mdx"
        ]
      }
    ]);
    expect(gh.calls[0].body?.variables).toEqual({ owner: "o", repo: "r", expr: "main:content/events" });
  });

  it("reports GraphQL errors", async () => {
    const gh = fakeGitHub({
      graphql: {
        data: { repository: null },
        errors: [{ type: "NOT_FOUND", message: "Could not resolve to a Repository" }]
      }
    });
    await expect(readEvents(gh.config)).rejects.toThrow(/o\/r/);
  });
});

describe("deployStatus", () => {
  const vercel = (state: string) => ({
    context: "Vercel",
    state,
    target_url: "https://vercel.com/x",
    description: "d"
  });

  it("is waiting until Vercel reports", async () => {
    expect(await deployStatus(fakeGitHub().config, "abc")).toEqual({ state: "waiting", url: null });
  });

  it("follows Vercel's status", async () => {
    const cases = { pending: "publishing", success: "live", failure: "failed", error: "failed" };
    for (const [github, ours] of Object.entries(cases)) {
      const gh = fakeGitHub({ statuses: [{ context: "other", state: "success" }, vercel(github)] });
      expect(await deployStatus(gh.config, "abc")).toEqual({ state: ours, url: "https://vercel.com/x" });
    }
  });
});
