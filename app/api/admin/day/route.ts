import { NextRequest, NextResponse } from "next/server";
import { database, ensureTable } from "../../../lib/db";

const STAFF_GROUPS = ["교사", "교역자"];

export async function GET(request: NextRequest) {
  if (request.cookies.get("admin_auth")?.value !== "1") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const sql = database();
  if (!sql) return NextResponse.json({ configured: false, entries: [] });
  await ensureTable(sql);

  const rows = await sql`
    SELECT school_group AS "schoolGroup", name, prayer_count AS "prayerCount"
    FROM prayers
    WHERE prayer_date = ${date}
    ORDER BY school_group = ANY(${STAFF_GROUPS}), school_group, name
  `;

  return NextResponse.json({ configured: true, entries: rows });
}
