import { NextRequest, NextResponse } from "next/server";
import { database, ensureTable } from "../../../lib/db";

export async function GET(request: NextRequest) {
  const schoolGroup = request.nextUrl.searchParams.get("schoolGroup");
  const name = request.nextUrl.searchParams.get("name");
  const date = request.nextUrl.searchParams.get("date");
  if (!schoolGroup || !name || !date) return NextResponse.json({ error: "schoolGroup, name, date가 필요해요" }, { status: 400 });

  const sql = database();
  if (!sql) return NextResponse.json({ configured: false, records: [], total: 0 });
  await ensureTable(sql);

  const rows = await sql`
    SELECT id::text AS id, prayer_count AS "prayerCount"
    FROM prayers
    WHERE school_group = ${schoolGroup} AND name = ${name} AND prayer_date = ${date}
    ORDER BY created_at ASC
  `;
  const total = rows.reduce((sum, row) => sum + Number(row.prayerCount), 0);

  return NextResponse.json({ configured: true, records: rows, total });
}
