import { NextResponse } from "next/server";
import { database, ensureTable } from "../../lib/db";

const GOAL = 5000;
const SUBMIT_WINDOW_DAYS = 7;

function kstToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

function daysAgoKst(days: number) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const kstNow = new Date(`${map.year}-${map.month}-${map.day}T00:00:00+09:00`);
  kstNow.setDate(kstNow.getDate() - days);
  return kstNow.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

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

  const earliest = daysAgoKst(SUBMIT_WINDOW_DAYS - 1);
  const latest = kstToday();
  if (body.prayerDate < earliest || body.prayerDate > latest) {
    return NextResponse.json({ error: "date_out_of_range", earliest, latest }, { status: 400 });
  }

  await ensureTable(sql);

  const dayRows = await sql`
    SELECT id::text AS id, prayer_count AS "prayerCount"
    FROM prayers
    WHERE school_group = ${body.schoolGroup} AND name = ${body.name} AND prayer_date = ${body.prayerDate}
    ORDER BY created_at ASC
  `;
  if (dayRows.length > 0) {
    return NextResponse.json({ error: "already_submitted", records: dayRows }, { status: 409 });
  }

  await sql`INSERT INTO prayers (school_group, name, prayer_date, prayer_count)
    VALUES (${body.schoolGroup}, ${body.name}, ${body.prayerDate}, ${count})`;
  const rows = await sql`SELECT LEAST(COALESCE(SUM(prayer_count), 0), ${GOAL})::int AS total FROM prayers`;
  return NextResponse.json({ total: rows[0].total });
}
