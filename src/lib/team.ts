import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const DEFAULT_FILE = path.join(process.cwd(), "content", "team.json");

const teamSchema = z.array(
  z.object({
    name: z.string().min(1),
    role: z.object({ ro: z.string().min(1), en: z.string().min(1) }),
    photo: z.string().optional()
  })
);

export type TeamMember = { name: string; role: string; photo?: string };

export function getTeam(locale: "ro" | "en", file = DEFAULT_FILE): TeamMember[] {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`team.json: invalid JSON — ${(e as Error).message}`);
  }
  const parsed = teamSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`team.json: ${issue.path.join(".")} ${issue.message}`);
  }
  return parsed.data.map((m) => ({ name: m.name, role: m.role[locale], photo: m.photo }));
}
