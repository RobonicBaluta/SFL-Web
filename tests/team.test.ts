import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getTeam } from "@/lib/team";

const tmpFiles: string[] = [];

function writeTemp(content: string): string {
  const file = path.join(os.tmpdir(), `team-${tmpFiles.length}-${process.pid}.json`);
  fs.writeFileSync(file, content);
  tmpFiles.push(file);
  return file;
}

afterEach(() => {
  for (const f of tmpFiles.splice(0)) fs.rmSync(f, { force: true });
});

describe("getTeam", () => {
  it("returns [] for an empty file", () => {
    expect(getTeam("ro", writeTemp("[]"))).toEqual([]);
  });

  it("resolves localized roles", () => {
    const file = writeTemp(
      JSON.stringify([{ name: "Ana Pop", role: { ro: "Președinte", en: "President" } }])
    );
    expect(getTeam("ro", file)).toEqual([{ name: "Ana Pop", role: "Președinte", photo: undefined }]);
    expect(getTeam("en", file)[0].role).toBe("President");
  });

  it("rejects entries missing a localized role", () => {
    const file = writeTemp(JSON.stringify([{ name: "Ana Pop", role: { ro: "Președinte" } }]));
    expect(() => getTeam("ro", file)).toThrow(/team\.json/);
  });

  it("rejects malformed JSON, naming the file", () => {
    const file = writeTemp('[{"name": "Ana Pop",}]');
    expect(() => getTeam("ro", file)).toThrow(/team\.json: invalid JSON/);
  });

  it("reads the real content/team.json without throwing", () => {
    expect(() => getTeam("ro")).not.toThrow();
  });
});
