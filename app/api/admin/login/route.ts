import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json() as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || body.password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
