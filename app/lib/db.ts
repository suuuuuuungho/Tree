import { neon } from "@neondatabase/serverless";

export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export async function ensureTable(sql: NonNullable<ReturnType<typeof database>>) {
  await sql`CREATE TABLE IF NOT EXISTS prayers (
    id BIGSERIAL PRIMARY KEY,
    school_group TEXT NOT NULL,
    name TEXT NOT NULL,
    prayer_date DATE NOT NULL,
    prayer_count INTEGER NOT NULL CHECK (prayer_count BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function ensureAccountsTable(sql: NonNullable<ReturnType<typeof database>>) {
  await sql`CREATE TABLE IF NOT EXISTS prayer_accounts (
    school_group TEXT NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (school_group, name)
  )`;
}
