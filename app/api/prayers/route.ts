import { NextResponse } from "next/server";
import { database, ensureTable } from "../../lib/db";

const GOAL = 5000;

export async function GET() {
  const sql = database();
  if (!sql) return NextResponse.json({ configured: false, total: 0 });
  await ensureTable(sql);
  const rows = await sql`SELECT LEAST(COALESCE(SUM(prayer_count), 0), ${GOAL})::int AS total FROM prayers`;
  return NextResponse.json({ configured: true, total: rows[0].total });
}

export async function POST(request: Request) {
  const sql = database();
  if (!sql) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });

  const body = await request.json() as { schoolGroup?: string; name?: string; prayerDate?: string; prayerCount?: number };
  const count = Number(body.prayerCount);
  if (!body.schoolGroup || !body.name || !body.prayerDate || !Number.isInteger(count) || count < 1 || count > 10) {
    return NextResponse.json({ error: "Invalid prayer record" }, { status: 400 });
  }

  await ensureTable(sql);
  await sql`INSERT INTO prayers (school_group, name, prayer_date, prayer_count)
    VALUES (${body.schoolGroup}, ${body.name}, ${body.prayerDate}, ${count})`;
  const rows = await sql`SELECT LEAST(COALESCE(SUM(prayer_count), 0), ${GOAL})::int AS total FROM prayers`;
  return NextResponse.json({ total: rows[0].total });
}
