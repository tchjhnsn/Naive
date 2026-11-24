// Waitlist interest on a throwaway local Postgres. No mail, no live database, no account.

import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import { applyWaitlistGrants, applyWaitlistSchema, enrollWaitlistRequest, normalizeWaitlistEmail, waitlistDatabaseName } from "./waitlist-store.ts";

let failed = 0;
const expect = (name: string, ok: boolean) => {
  console.log(`${ok ? "ok" : "FAIL"}  ${name}`);
  if (!ok) failed++;
};

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const hrefs = (text: string) => [...text.matchAll(/href="([^"]+)"/g)].map((match) => match[1] ?? "");
const labeled = (text: string) => {
  const found: string[] = [];
  for (const match of text.matchAll(/<CTA\s+href="([^"]+)"[^>]*>\s*Waitlist/g)) found.push(match[1] ?? "");
  for (const match of text.matchAll(/<Hero\b[^>]*\shref="([^"]+)"[^>]*\saction="Waitlist"/g)) found.push(match[1] ?? "");
  for (const match of text.matchAll(/href="([^"]+)"[^>]*>\s*Waitlist\s*</g)) found.push(match[1] ?? "");
  for (const match of text.matchAll(/href:\s*"([^"]+)",\s*label:\s*"Waitlist"/g)) found.push(match[1] ?? "");
  return found;
};

const sources = [
  "../content/marketing/index.mdx",
  "../content/marketing/about.mdx",
  "../content/marketing/how.mdx",
  "../components/shell/nav.ts",
  "../components/blog/header.tsx",
].map(read);
const destinations = sources.flatMap(labeled);
expect("public waitlist labels point at /waitlist", destinations.length >= 5 && destinations.every((href) => href === "/waitlist"));
expect("no waitlist label uses a hash or sign-in", sources.every((text) => !text.includes('href="#') && !/Waitlist[\s\S]{0,80}sign-in|sign-in[\s\S]{0,80}Waitlist/.test(text)));
const page = read("../content/marketing/waitlist.mdx");
expect("the waitlist page posts interest to the enrollment route", page.includes('action="/waitlist/enroll"') || read("../components/waitlist-form.tsx").includes('action="/waitlist/enroll"'));
expect("the home page links to /waitlist", hrefs(sources[0] ?? "").includes("/waitlist"));
expect("an address is folded", normalizeWaitlistEmail("  Ada@Example.test ") === "ada@example.test");
expect("a broken address is refused", normalizeWaitlistEmail("not-an-email") === null);
const sql = (text: string) => text.replace(/--.*$/gm, "");
const schema = sql(read("../waitlist/001_interest.sql"));
const grants = sql(read("../waitlist/002_grants.sql"));
expect("the migration does not touch identity or auth tables", !/identity_|mentura_identity|neondb|naive_record|\buser\b|\bsession\b/i.test(schema));
expect("the grants allow only the enroll function", /grant execute on function public\.waitlist_enroll\(pg_catalog\.text, pg_catalog\.text\)/i.test(grants) && !/grant select on table/i.test(grants) && !/grant delete/i.test(grants));
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
expect("the interest migration hash is the reviewed file", digest(read("../waitlist/001_interest.sql")) === "58fde51e046008aa2269585095f85a2cf22d9d5b427bf4b806432f862dff4639");
expect("the grants hash is the reviewed file", digest(read("../waitlist/002_grants.sql")) === "3ca823e3c9e8888e65e1235daa273eb0d71db9d149969edff168a93b6150fc48");
expect("the waitlist page does not say templates are available now", page.includes("does not make templates available") && !page.includes("starting with templates") && !page.includes("get early access"));
const agents = read("../AGENTS.md");
const model = read("../verification/site-nextra/SiteRoutes.tla");
const modelReadme = read("../verification/site-nextra/README.md");
expect("the site guide describes interest, not a placeholder", agents.includes("records an email as interest in early access") && !agents.includes("static placeholder") && !agents.includes("does not collect a sign-up"));
expect("the route model no longer calls the page a placeholder", !model.includes("placeholder") && !model.includes("collects no sign-up") && model.includes("records an email as interest"));
expect("the route notes match the page", modelReadme.includes("records an email as interest") && !modelReadme.includes("signup is not built") && !modelReadme.includes("the placeholder"));

const refusal = "Refusing to migrate a waitlist database that is not on localhost.";
const remote = "postgres://mentura_waitlist:not-used@example.invalid/mentura_waitlist";
const RealPool = pg.Pool;
let opened = 0;
pg.Pool = class extends RealPool {
  constructor(config: ConstructorParameters<typeof RealPool>[0]) {
    opened += 1;
    super(config);
  }
} as typeof pg.Pool;
try {
  for (const [name, run] of [["schema", applyWaitlistSchema], ["grants", applyWaitlistGrants]] as const) {
    const started = Date.now();
    const message = await Promise.race([
      run(remote).then(() => "connected", (error: unknown) => error instanceof Error ? error.message : "error"),
      new Promise<string>((resolve) => setTimeout(() => resolve("timed out"), 1000)),
    ]);
    expect(`${name} refuses a non-loopback host before connecting`, message === refusal && opened === 0 && Date.now() - started < 1000);
  }
} finally {
  pg.Pool = RealPool;
}

const source = process.env.MENTURA_EVAL_DATABASE_URL || process.env.MENTURA_IDENTITY_DATABASE_URL || "";
if (!source) {
  console.error(process.env.CI ? "FAIL  waitlist: CI did not set a local Postgres URL" : "SKIP  waitlist: set MENTURA_EVAL_DATABASE_URL or MENTURA_IDENTITY_DATABASE_URL");
  process.exit(process.env.CI ? 1 : failed ? 1 : 0);
}
const adminUrl = new URL(source);
if (!["localhost", "127.0.0.1", "::1"].includes(adminUrl.hostname)) {
  console.error("FAIL  waitlist refuses a database host that is not loopback");
  process.exit(1);
}
const databaseName = "mentura_waitlist_rehearsal";
const role = "mentura_waitlist";
const password = randomBytes(18).toString("hex");
const redact = (error: unknown) => String(error instanceof Error ? error.message : error).replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://redacted");
const control = new pg.Pool({ connectionString: source, max: 1 });

const drop = async () => {
  const pool = new pg.Pool({ connectionString: source, max: 1 });
  try {
    await pool.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`, [databaseName]);
    await pool.query(`drop database if exists ${databaseName}`);
    await pool.query(`drop role if exists ${role}`);
  } finally {
    await pool.end();
  }
};

try {
  await drop();
  await control.query(`create database ${databaseName}`);
  await control.query(`create role ${role} login nosuperuser nocreatedb nocreaterole nobypassrls password '${password}'`);
  const owner = new URL(source);
  owner.pathname = `/${databaseName}`;
  const ownerPool = new pg.Pool({ connectionString: owner.toString(), max: 1 });
  const relation = async () => (await ownerPool.query<{ rel: string | null }>("select to_regclass('public.waitlist_interest')::text as rel")).rows[0]?.rel ?? null;
  const remoteOwner = new URL(owner);
  remoteOwner.hostname = "example.invalid";
  let remoteSchema = "";
  try { await applyWaitlistSchema(remoteOwner.toString()); } catch (error) { remoteSchema = error instanceof Error ? error.message : ""; }
  expect("a refused schema call does not create the table", remoteSchema === refusal && await relation() === null);
  await applyWaitlistSchema(owner.toString());
  let remoteGrants = "";
  try { await applyWaitlistGrants(remoteOwner.toString()); } catch (error) { remoteGrants = error instanceof Error ? error.message : ""; }
  const privilege = async () => (await ownerPool.query<{ open: boolean }>("select has_function_privilege('public', 'waitlist_enroll(text, text)', 'execute') as open")).rows[0]?.open === true;
  expect("a refused grants call does not change privileges", remoteGrants === refusal && await relation() === "waitlist_interest" && await privilege());
  await applyWaitlistGrants(owner.toString());
  expect("loopback grants revoke public execute", await privilege() === false);
  const enrollUrl = new URL(owner);
  enrollUrl.username = role;
  enrollUrl.password = password;
  process.env.NAIVE_WAITLIST_DATABASE_URL = enrollUrl.toString();
  delete process.env.MENTURA_DATABASE_URL;

  const post = (email: string, interest?: string) => {
    const body = new URLSearchParams({ email });
    if (interest) body.set("interest", interest);
    return enrollWaitlistRequest(new Request("http://127.0.0.1:3100/waitlist/enroll", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }));
  };
  const count = async () => {
    const row = await ownerPool.query<{ n: number }>("select count(*)::int as n from waitlist_interest");
    return row.rows[0]?.n ?? 0;
  };
  const logs: string[] = [];
  const wrapped = console.error;
  console.error = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); wrapped(...args); };

  const saved = await post("Ada@Example.test", "yes");
  const savedText = await saved.text();
  expect("a form post records interest without echoing the address", saved.status === 200 && savedText.includes("You're on the waitlist") && savedText.includes("not an account") && !savedText.toLowerCase().includes("ada@"));
  expect("one row stores the folded address, consent time, and product", (await ownerPool.query<{ email: string; product: string; consent_at: Date }>("select email, product, consent_at from waitlist_interest")).rows[0]?.email === "ada@example.test" && (await count()) === 1);
  const again = await post("ada@example.test", "yes");
  const againText = await again.text();
  expect("a duplicate gets the same answer and stays one row", again.status === 200 && againText.includes("You're on the waitlist") && await count() === 1);
  const missing = await post("grace@example.test", "");
  expect("consent is required and stores nothing", missing.status === 400 && (await missing.text()).includes("Confirm interest only") && await count() === 1);
  const bad = await post("not-an-email", "yes");
  expect("a broken address is not stored", bad.status === 400 && await count() === 1);
  const roleClient = new pg.Client({ connectionString: enrollUrl.toString() });
  await roleClient.connect();
  let denied = false;
  try { await roleClient.query("select email from waitlist_interest"); } catch { denied = true; }
  let cannotDelete = false;
  try { await roleClient.query("delete from waitlist_interest"); } catch { cannotDelete = true; }
  await roleClient.end();
  expect("the enrollment role cannot read or delete addresses", denied && cannotDelete && await count() === 1);
  const shadow = new pg.Client({ connectionString: enrollUrl.toString() });
  await shadow.connect();
  const tempAllowed = await shadow.query<{ temp: boolean }>("select has_database_privilege(current_user, current_database(), 'temp') as temp");
  const fnOwner = (await ownerPool.query<{ owner: string }>("select pg_get_userbyid(proowner) as owner from pg_proc where proname = 'waitlist_enroll'")).rows[0]?.owner ?? "";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(fnOwner)) throw new Error("unexpected function owner");
  await shadow.query(`
    create temp table waitlist_interest (email text primary key, consent_at timestamptz, product text);
    create temp table stolen (email text);
    grant all on table pg_temp.waitlist_interest to ${fnOwner};
    grant all on table pg_temp.stolen to ${fnOwner};
    create function pg_temp.steal() returns trigger language plpgsql as $fn$
    begin
      insert into stolen (email) select email from public.waitlist_interest;
      delete from public.waitlist_interest;
      return new;
    end
    $fn$;
    create trigger steal before insert on pg_temp.waitlist_interest
    for each row execute function pg_temp.steal();
  `);
  const attacked = await shadow.query<{ waitlist_enroll: string }>("select waitlist_enroll('shadow@example.test', null) as waitlist_enroll");
  const stolen = await shadow.query<{ n: number }>("select count(*)::int as n from stolen");
  await shadow.end();
  const kept = await ownerPool.query<{ email: string }>("select email from public.waitlist_interest where email = 'ada@example.test'");
  const planted = await ownerPool.query<{ n: number }>("select count(*)::int as n from public.waitlist_interest where email = 'shadow@example.test'");
  await ownerPool.query("delete from public.waitlist_interest where email = 'shadow@example.test'");
  expect("a temporary shadow trigger cannot read or delete real addresses", tempAllowed.rows[0]?.temp === true && attacked.rows[0]?.waitlist_enroll === "recorded" && stolen.rows[0]?.n === 0 && kept.rows[0]?.email === "ada@example.test" && planted.rows[0]?.n === 1 && await count() === 1);
  const refusedUrl = new URL(owner);
  refusedUrl.pathname = "/mentura_identity";
  process.env.NAIVE_WAITLIST_DATABASE_URL = refusedUrl.toString();
  const refused = await post("other@example.test", "yes");
  expect("the identity database name is refused", refused.status === 400 && (await refused.text()).includes("cannot record") && await count() === 1);
  process.env.NAIVE_WAITLIST_DATABASE_URL = enrollUrl.toString();
  delete process.env.VERCEL;
  for (let i = 0; i < 12; i += 1) {
    const open = await post(`open${i}@example.test`, "yes");
    if (open.status !== 200) failed++;
  }
  expect("without a trusted platform address there is no shared cap", await count() === 13);
  process.env.VERCEL = "1";
  const postFrom = (email: string, platformIp: string) => {
    const body = new URLSearchParams({ email, interest: "yes" });
    return enrollWaitlistRequest(new Request("http://127.0.0.1:3100/waitlist/enroll", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-forwarded-for": "198.51.100.9",
        "x-vercel-forwarded-for": platformIp,
      },
      body,
    }));
  };
  for (let i = 0; i < 30; i += 1) {
    const paced = await postFrom(`paced${i}@example.test`, "203.0.113.10");
    if (paced.status !== 200) failed++;
  }
  const limited = await postFrom("overflow@example.test", "203.0.113.10");
  const limitedText = await limited.text();
  const other = await postFrom("other-net@example.test", "203.0.113.11");
  expect("one trusted address can be limited without stopping a different address", limited.status === 400 && limitedText.includes("could not record interest") && !limitedText.toLowerCase().includes("overflow@") && other.status === 200 && await count() === 44);
  delete process.env.VERCEL;
  expect("the address was not logged", !logs.some((line) => line.toLowerCase().includes("ada@")));
  expect("the database name parser reads the path", waitlistDatabaseName(owner.toString()) === databaseName);
  console.error = wrapped;
  await ownerPool.end();
} catch (error) {
  console.error(`FAIL  waitlist ${redact(error)}`);
  failed++;
} finally {
  await control.end();
  try { await drop(); } catch (error) { console.error(`FAIL  waitlist cleanup ${redact(error)}`); failed++; }
}

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("waitlist: all passing");
