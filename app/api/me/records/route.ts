import { NextRequest, NextResponse } from "next/server";
import { database, ensureTable } from "../../../lib/db";
import { SESSION_COOKIE, verifySession } from "../../../lib/session";

export async function GET(request: NextRequest) {
  const identity = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sql = database();
  if (!sql) return NextResponse.json({ configured: false, records: [] });
  await ensureTable(sql);

  const rows = await sql`
    SELECT id::text AS id, prayer_date::text AS date, prayer_count AS "prayerCount"
    FROM prayers
    WHERE school_group = ${identity.schoolGroup} AND name = ${identity.name}
    ORDER BY prayer_date ASC
  `;

  return NextResponse.json({ configured: true, identity, records: rows });
}
