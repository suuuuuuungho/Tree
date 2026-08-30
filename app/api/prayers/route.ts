import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const GOAL = 5000;

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureTable(sql: NonNullable<ReturnType<typeof database>>) {
  await sql`CREATE TABLE IF NOT EXISTS prayers (
    id BIGSERIAL PRIMARY KEY,
    school_group TEXT NOT NULL,
    name TEXT NOT NULL,
    prayer_date DATE NOT NULL,
    prayer_count INTEGER NOT NULL CHECK (prayer_count BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
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

  await ensureTable(sql);
  await sql`INSERT INTO prayers (school_group, name, prayer_date, prayer_count)
    VALUES (${body.schoolGroup}, ${body.name}, ${body.prayerDate}, ${count})`;
  const rows = await sql`SELECT LEAST(COALESCE(SUM(prayer_count), 0), ${GOAL})::int AS total FROM prayers`;
  return NextResponse.json({ total: rows[0].total });
}
