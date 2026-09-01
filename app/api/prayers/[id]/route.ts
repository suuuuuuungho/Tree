import { NextRequest, NextResponse } from "next/server";
import { database, ensureTable } from "../../../lib/db";

// No password gate here -- the main submission form itself has none (anyone
// can already submit under any name), so editing/deleting an entry under
// that same name+class carries no new trust assumption. Scoped to matching
// schoolGroup+name so a stranger can't touch someone else's record by id.

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as { schoolGroup?: string; name?: string; date?: string; prayerCount?: number };
  const count = Number(body.prayerCount);
  if (!body.schoolGroup || !body.name || !body.date || !Number.isInteger(count) || count < 1 || count > 10) {
    return NextResponse.json({ error: "Invalid record" }, { status: 400 });
  }

  const sql = database();
  if (!sql) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  await ensureTable(sql);

  const updated = await sql`
    UPDATE prayers
    SET prayer_date = ${body.date}, prayer_count = ${count}
    WHERE id = ${id} AND school_group = ${body.schoolGroup} AND name = ${body.name}
    RETURNING id
  `;
  if (updated.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as { schoolGroup?: string; name?: string };
  if (!body.schoolGroup || !body.name) return NextResponse.json({ error: "schoolGroup, name이 필요해요" }, { status: 400 });

  const sql = database();
  if (!sql) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  await ensureTable(sql);

  const deleted = await sql`DELETE FROM prayers WHERE id = ${id} AND school_group = ${body.schoolGroup} AND name = ${body.name} RETURNING id`;
  if (deleted.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
