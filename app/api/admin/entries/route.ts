import { NextRequest, NextResponse } from "next/server";
import { database, ensureTable } from "../../../lib/db";

export async function GET(request: NextRequest) {
  if (request.cookies.get("admin_auth")?.value !== "1") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sql = database();
  if (!sql) return NextResponse.json({ configured: false, entries: [] });
  await ensureTable(sql);

  const rows = await sql`
    SELECT school_group AS "schoolGroup", name, prayer_date::text AS date, prayer_count AS "prayerCount"
    FROM prayers
    ORDER BY prayer_date ASC, school_group ASC, name ASC
  `;

  return NextResponse.json({ configured: true, entries: rows });
}
