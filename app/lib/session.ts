import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "prayer_session";

export type SessionIdentity = { schoolGroup: string; name: string };

function secret() {
  // Reuses the already-secret DATABASE_URL as HMAC key material instead of
  // requiring a dedicated session secret to be configured.
  return process.env.DATABASE_URL ?? "dev-only-fallback-secret";
}

export function signSession(identity: SessionIdentity) {
  const data = Buffer.from(JSON.stringify(identity)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifySession(token: string | undefined | null): SessionIdentity | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = createHmac("sha256", secret()).update(data).digest("base64url");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !timingSafeEqual(expectedBuf, signatureBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString()) as Partial<SessionIdentity>;
    if (typeof parsed.schoolGroup !== "string" || typeof parsed.name !== "string") return null;
    return { schoolGroup: parsed.schoolGroup, name: parsed.name };
  } catch {
    return null;
  }
}
