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
    SELECT id::text AS id, school_group AS "schoolGroup", name, prayer_date::text AS date, prayer_count AS "prayerCount",
      to_char(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS "createdAt"
    FROM prayers
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ configured: true, entries: rows });
}
