import { expect, it } from "vitest";
import ro from "../messages/ro.json";
import en from "../messages/en.json";

function keysOf(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === "object"
      ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );
}

it("ro.json and en.json have identical key sets", () => {
  expect(keysOf(ro).sort()).toEqual(keysOf(en).sort());
});

it("no message value is empty", () => {
  const check = (obj: Record<string, unknown>, path: string) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && typeof v === "object") check(v as Record<string, unknown>, `${path}${k}.`);
      else expect(String(v).trim(), `${path}${k}`).not.toBe("");
    }
  };
  check(ro, "ro:");
  check(en, "en:");
});
