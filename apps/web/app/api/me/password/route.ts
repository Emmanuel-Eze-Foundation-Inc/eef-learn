import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";

const bodySchema = z.object({ newPassword: z.string().min(1) });

/**
 * POST /api/me/password — add a password to an account that only signs in with Google.
 * Better Auth keeps `setPassword` server-only, so the browser calls this instead.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a password." }, { status: 422 });
  try {
    await auth.api.setPassword({ body: parsed.data, headers: await headers() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.body?.message ?? err.message }, { status: err.statusCode });
    }
    throw err;
  }
}
