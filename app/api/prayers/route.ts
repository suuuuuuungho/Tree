import { NextResponse } from "next/server";
import { database, ensureTable } from "../../lib/db";

const GOAL = 5000;
const DAILY_LIMIT = 10;

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

  const body = await request.json() as { schoolGroup?: string; name?: string; prayerDate?: string; prayerCount?: number; force?: boolean };
  const count = Number(body.prayerCount);
  if (!body.schoolGroup || !body.name || !body.prayerDate || !Number.isInteger(count) || count < 1 || count > 10) {
    return NextResponse.json({ error: "Invalid prayer record" }, { status: 400 });
  }

  await ensureTable(sql);

  if (!body.force) {
    const dayRows = await sql`
      SELECT id::text AS id, prayer_count AS "prayerCount"
      FROM prayers
      WHERE school_group = ${body.schoolGroup} AND name = ${body.name} AND prayer_date = ${body.prayerDate}
      ORDER BY created_at ASC
    `;
    const existingTotal = dayRows.reduce((sum, row) => sum + Number(row.prayerCount), 0);
    if (existingTotal + count >= DAILY_LIMIT) {
      return NextResponse.json({ error: "daily_limit", existingTotal, records: dayRows }, { status: 409 });
    }
  }

  await sql`INSERT INTO prayers (school_group, name, prayer_date, prayer_count)
    VALUES (${body.schoolGroup}, ${body.name}, ${body.prayerDate}, ${count})`;
  const rows = await sql`SELECT LEAST(COALESCE(SUM(prayer_count), 0), ${GOAL})::int AS total FROM prayers`;
  return NextResponse.json({ total: rows[0].total });
}
