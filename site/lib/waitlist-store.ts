// Interest in Naive early access. Not an account: no password, no session, no mail.
// The store is Postgres named by NAIVE_WAITLIST_DATABASE_URL. It is not the identity
// database and not the tenant record store. When the URL is unset or refused, nothing is stored.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const WAITLIST_PRODUCT = "naive-early-access";
const RESERVED = new Set(["mentura_identity", "neondb", "mentura_eval", "postgres", "template0", "template1"]);

export type WaitlistEnrollment = "recorded" | "invalid" | "consent" | "closed" | "limited";

export function normalizeWaitlistEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || email.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (/[\u0000-\u001f\u007f]/.test(email)) return null;
  return email;
}

export function waitlistDatabaseName(url: string): string {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return ""; }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") return "";
  return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
}

function reservedName(url: string): boolean {
  const name = waitlistDatabaseName(url);
  if (!name || RESERVED.has(name)) return true;
  for (const key of ["MENTURA_IDENTITY_DATABASE_URL", "MENTURA_AUTH_DATABASE_URL", "MENTURA_DATABASE_URL"]) {
    const other = process.env[key];
    if (!other) continue;
    if (other.trim() === url.trim()) return true;
    const otherName = waitlistDatabaseName(other);
    if (otherName && otherName === name) return true;
  }
  return false;
}

export function waitlistUrl(): string | null {
  const url = process.env.NAIVE_WAITLIST_DATABASE_URL?.trim();
  if (!url || reservedName(url)) return null;
  return url;
}

async function withClient<T>(url: string, run: (_client: pg.PoolClient) => Promise<T>): Promise<T> {
  const pool = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try {
    await client.query("set statement_timeout = '4s'");
    return await run(client);
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * A platform client address, only when this process is on Vercel.
 * `x-vercel-forwarded-for` is set by Vercel. A caller-supplied `x-forwarded-for` is not used.
 * The stored bucket is a hash, not the address. No trusted address means no shared counter.
 */
export function trustedWaitlistBucket(request: Request): string | null {
  if (process.env.VERCEL !== "1") return null;
  const raw = request.headers.get("x-vercel-forwarded-for")?.trim() ?? "";
  const ip = raw.split(",").map((part) => part.trim()).filter((part) => part.length > 0).at(-1) ?? "";
  if (!ip || ip.length > 80 || /[\s"]/.test(ip)) return null;
  return createHash("sha256").update(ip).digest("hex");
}

/** Inserts the address once. A repeat is the same row. The result does not say which. */
export async function recordWaitlistInterest(url: string, email: string, bucket: string | null): Promise<"recorded" | "limited"> {
  return withClient(url, async (client) => {
    try {
      const row = await client.query<{ waitlist_enroll: string }>("select waitlist_enroll($1, $2) as waitlist_enroll", [email, bucket]);
      const result = row.rows[0]?.waitlist_enroll;
      if (result === "recorded" || result === "limited") return result;
      throw new Error("waitlist write failed");
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : "";
      throw new Error(code ? `waitlist write failed ${code}` : "waitlist write failed");
    }
  });
}

export async function enrollWaitlistFields(form: FormData, bucket: string | null): Promise<WaitlistEnrollment> {
  if (form.get("interest") !== "yes") return "consent";
  const email = normalizeWaitlistEmail(String(form.get("email") ?? ""));
  if (!email) return "invalid";
  const url = waitlistUrl();
  if (!url) return "closed";
  try {
    return await recordWaitlistInterest(url, email, bucket);
  } catch {
    return "closed";
  }
}

const pages: Record<WaitlistEnrollment, { title: string; detail: string; alert: boolean }> = {
  recorded: { title: "You're on the waitlist", detail: "This is not an account, and no message was sent.", alert: false },
  invalid: { title: "Enter an email address", detail: "The waitlist did not record that submission.", alert: true },
  consent: { title: "Confirm interest only", detail: "The box has to be checked. This does not create an account.", alert: true },
  closed: { title: "The waitlist cannot record interest on this host yet", detail: "Nothing was stored.", alert: true },
  limited: { title: "The waitlist could not record interest just now", detail: "You can try again. Nothing about an address is confirmed.", alert: true },
};

function page(result: WaitlistEnrollment): string {
  const copy = pages[result];
  const role = copy.alert ? "alert" : "status";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${copy.title}</title></head><body style="margin:0;font-family:system-ui,sans-serif"><main style="max-width:24rem;margin:0 auto;padding:2rem 1rem"><h1 style="font-size:1.5rem">${copy.title}</h1><p role="${role}" style="font-size:1rem;line-height:1.5">${copy.detail}</p><p><a href="/waitlist">Back to the waitlist</a></p></main></body></html>`;
}

/** The form POST. The body never includes the address. */
export async function enrollWaitlistRequest(request: Request): Promise<Response> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > 4096) return html("invalid");
  let form: FormData;
  try { form = await request.formData(); } catch { return html("invalid"); }
  const result = await enrollWaitlistFields(form, trustedWaitlistBucket(request));
  return html(result);
}

function html(result: WaitlistEnrollment): Response {
  return new Response(page(result), {
    status: result === "recorded" ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

const schemaDir = join(dirname(fileURLToPath(import.meta.url)), "..", "waitlist");
const loopback = new Set(["localhost", "127.0.0.1", "::1"]);

/** Both rehearsal helpers stop here. A hosted database is migrated by the owner, with the SQL files, not by these functions. */
function assertLocalMigration(url: string): void {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  if (!loopback.has(host)) throw new Error("Refusing to migrate a waitlist database that is not on localhost.");
  if (reservedName(url)) throw new Error("Refusing to migrate a reserved database.");
}

/** Applies the enrollment tables on a loopback database. Hosted SQL is applied by the owner, not by this function. */
export async function applyWaitlistSchema(url: string): Promise<void> {
  assertLocalMigration(url);
  const sql = readFileSync(join(schemaDir, "001_interest.sql"), "utf8");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

/** Applies the enrollment grants on a loopback database. It is not a public route, and it does not connect anywhere else. */
export async function applyWaitlistGrants(url: string): Promise<void> {
  assertLocalMigration(url);
  const sql = readFileSync(join(schemaDir, "002_grants.sql"), "utf8");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}
