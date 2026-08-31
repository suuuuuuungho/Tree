import { NextRequest, NextResponse } from "next/server";
import { database, ensureTable } from "../../../../lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (request.cookies.get("admin_auth")?.value !== "1") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json() as { schoolGroup?: string; name?: string; date?: string; prayerCount?: number };
  const count = Number(body.prayerCount);
  if (!body.schoolGroup || !body.name || !body.date || !Number.isInteger(count) || count < 1 || count > 10) {
    return NextResponse.json({ error: "Invalid record" }, { status: 400 });
  }

  const sql = database();
  if (!sql) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  await ensureTable(sql);

  await sql`
    UPDATE prayers
    SET school_group = ${body.schoolGroup}, name = ${body.name}, prayer_date = ${body.date}, prayer_count = ${count}
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (request.cookies.get("admin_auth")?.value !== "1") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sql = database();
  if (!sql) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  await ensureTable(sql);

  await sql`DELETE FROM prayers WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
