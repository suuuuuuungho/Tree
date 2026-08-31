import { NextRequest, NextResponse } from "next/server";
import { database, ensureTable } from "../../../../lib/db";
import { SESSION_COOKIE, verifySession } from "../../../../lib/session";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as { date?: string; prayerCount?: number };
  const count = Number(body.prayerCount);
  if (!body.date || !Number.isInteger(count) || count < 1 || count > 10) {
    return NextResponse.json({ error: "Invalid record" }, { status: 400 });
  }

  const sql = database();
  if (!sql) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  await ensureTable(sql);

  const updated = await sql`
    UPDATE prayers
    SET prayer_date = ${body.date}, prayer_count = ${count}
    WHERE id = ${id} AND school_group = ${identity.schoolGroup} AND name = ${identity.name}
    RETURNING id
  `;
  if (updated.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = database();
  if (!sql) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  await ensureTable(sql);

  await sql`DELETE FROM prayers WHERE id = ${id} AND school_group = ${identity.schoolGroup} AND name = ${identity.name}`;
  return NextResponse.json({ ok: true });
}
