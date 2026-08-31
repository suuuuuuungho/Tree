import { NextResponse } from "next/server";
import { database, ensureAccountsTable } from "../../../lib/db";

export async function POST(request: Request) {
  const sql = database();
  if (!sql) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const body = await request.json() as { schoolGroup?: string; name?: string };
  if (!body.schoolGroup || !body.name) return NextResponse.json({ error: "학년 · 반과 이름을 입력해 주세요" }, { status: 400 });

  await ensureAccountsTable(sql);
  const rows = await sql`SELECT 1 FROM prayer_accounts WHERE school_group = ${body.schoolGroup} AND name = ${body.name}`;
  return NextResponse.json({ exists: rows.length > 0 });
}
