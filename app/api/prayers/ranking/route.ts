import { NextResponse } from "next/server";
import { database, ensureTable } from "../../../lib/db";

const EXCLUDED_GROUPS = ["교사", "교역자"];

export async function GET() {
  const sql = database();
  if (!sql) return NextResponse.json({ configured: false, entries: [] });
  await ensureTable(sql);
  const rows = await sql`
    SELECT school_group AS "schoolGroup", name, SUM(prayer_count)::int AS total
    FROM prayers
    WHERE school_group != ALL(${EXCLUDED_GROUPS})
    GROUP BY school_group, name
    HAVING SUM(prayer_count) > 0
    ORDER BY total DESC, name ASC
    LIMIT 100
  `;
  return NextResponse.json({ configured: true, entries: rows });
}
