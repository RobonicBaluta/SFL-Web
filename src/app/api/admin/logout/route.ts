import { NextResponse, type NextRequest } from "next/server";
import { jsonError, sameOrigin } from "@/lib/admin/auth";
import { SESSION_COOKIE } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "Cross-site request refused.");
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
