import { NextRequest, NextResponse } from "next/server";
import { database, ensureTable } from "../../../lib/db";

const STAFF_GROUPS = ["교사", "교역자"];

export async function GET(request: NextRequest) {
  if (request.cookies.get("admin_auth")?.value !== "1") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sql = database();
  if (!sql) return NextResponse.json({ configured: false, daily: [] });
  await ensureTable(sql);

  const rows = await sql`
    SELECT prayer_date::text AS date,
      SUM(prayer_count)::int AS total,
      SUM(CASE WHEN school_group = ANY(${STAFF_GROUPS}) THEN 0 ELSE prayer_count END)::int AS student,
      SUM(CASE WHEN school_group = ANY(${STAFF_GROUPS}) THEN prayer_count ELSE 0 END)::int AS teacher
    FROM prayers
    GROUP BY prayer_date
    ORDER BY prayer_date ASC
  `;

  return NextResponse.json({ configured: true, daily: rows });
}
