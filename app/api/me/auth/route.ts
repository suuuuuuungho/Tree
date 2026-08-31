import { NextResponse } from "next/server";
import { database, ensureAccountsTable } from "../../../lib/db";
import { hashPassword, verifyPassword } from "../../../lib/password";
import { SESSION_COOKIE, signSession } from "../../../lib/session";

export async function POST(request: Request) {
  const sql = database();
  if (!sql) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const body = await request.json() as { schoolGroup?: string; name?: string; password?: string };
  if (!body.schoolGroup || !body.name || !body.password) {
    return NextResponse.json({ error: "학년 · 반, 이름, 비밀번호를 모두 입력해 주세요" }, { status: 400 });
  }
  if (!/^\d{4,}$/.test(body.password)) {
    return NextResponse.json({ error: "비밀번호는 숫자 4자리 이상으로 입력해 주세요" }, { status: 400 });
  }

  await ensureAccountsTable(sql);
  const rows = await sql`SELECT password_hash AS "passwordHash" FROM prayer_accounts WHERE school_group = ${body.schoolGroup} AND name = ${body.name}`;

  let created = false;
  if (rows.length === 0) {
    await sql`INSERT INTO prayer_accounts (school_group, name, password_hash) VALUES (${body.schoolGroup}, ${body.name}, ${hashPassword(body.password)})`;
    created = true;
  } else if (!verifyPassword(body.password, rows[0].passwordHash as string)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않아요" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, created });
  response.cookies.set(SESSION_COOKIE, signSession({ schoolGroup: body.schoolGroup, name: body.name }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
