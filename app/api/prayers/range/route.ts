import { NextRequest, NextResponse } from "next/server";
import { database, ensureTable } from "../../../lib/db";

export async function GET(request: NextRequest) {
  const schoolGroup = request.nextUrl.searchParams.get("schoolGroup");
  const name = request.nextUrl.searchParams.get("name");
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!schoolGroup || !name || !start || !end) {
    return NextResponse.json({ error: "schoolGroup, name, start, end이 필요해요" }, { status: 400 });
  }

  const sql = database();
  if (!sql) return NextResponse.json({ configured: false, days: [] });
  await ensureTable(sql);

  const rows = await sql`
    SELECT prayer_date::text AS date, SUM(prayer_count)::int AS total
    FROM prayers
    WHERE school_group = ${schoolGroup} AND name = ${name} AND prayer_date BETWEEN ${start} AND ${end}
    GROUP BY prayer_date
  `;

  return NextResponse.json({ configured: true, days: rows });
}
