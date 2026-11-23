# Waitlist enrollment store

This is interest in early access. It is not an account, not `mentura_identity`, and not `neondb`.

The site reads `NAIVE_WAITLIST_DATABASE_URL` at request time. The value is a Postgres URL for database `mentura_waitlist`, role `mentura_waitlist`. The site does not create the database, the role, or the grants. `applyWaitlistSchema` and `applyWaitlistGrants` are local rehearsal helpers. Both refuse a host that is not loopback before they connect, so neither migrates nor grants on Neon. They are not a public route. The owner applies the SQL files on `mentura_waitlist`.

Observed Neon project, read only, not changed by this repository:

| | |
| --- | --- |
| Project | Mentura (`flat-king-46456222`) |
| Region | `aws-us-east-2` |
| Branch | `production` (`br-broad-fog-bdeok1l6`) |
| Existing databases | `mentura_identity` (owner `mentura_identity`), `neondb` (owner `neondb_owner`) |
| Site | Vercel `mentura-docs` (`prj_Tl4gGJOCUCfxXz5L5bRus2HHCEAR`), Next.js, Node `24.x` |

Do not put the waitlist in `mentura_identity` or `neondb`. Do not grant this role `CONNECT` on those databases. Do not set `MENTURA_IDENTITY_DATABASE_URL`, `MENTURA_AUTH_DATABASE_URL`, or `MENTURA_DATABASE_URL` on `mentura-docs` to this URL.

## What the owner runs

Connected to the Neon project, as a role that can create a database:

```sql
create database mentura_waitlist;
create role mentura_waitlist login nosuperuser nocreatedb nocreaterole nobypassrls password 'choose-a-password';
revoke all on database mentura_waitlist from public;
grant connect on database mentura_waitlist to mentura_waitlist;
```

Then connect to `mentura_waitlist` and run `001_interest.sql`, then `002_grants.sql`.

The reviewed files are:

- `001_interest.sql` sha256 `58fde51e046008aa2269585095f85a2cf22d9d5b427bf4b806432f862dff4639`
- `002_grants.sql` sha256 `3ca823e3c9e8888e65e1235daa273eb0d71db9d149969edff168a93b6150fc48`

The app role can execute `public.waitlist_enroll(text, text)`. It cannot select or delete addresses, including through that function. There is no public list. Ordinary Postgres grants this role `TEMP`, and these files do not revoke it. `waitlist_enroll` is security definer. Its body names `public` tables and `pg_catalog` functions and types, and its `search_path` is `pg_catalog, pg_temp` with the temporary schema last. A temporary table, type, or trigger cannot take the place of those objects, so the call cannot copy or delete the stored addresses.

On Vercel the second argument is a hash of `x-vercel-forwarded-for`, the client address Vercel sets. A caller-supplied `x-forwarded-for` is not used. That hash gets 30 attempts in 10 minutes. A different platform address has its own counter. This is not a global cap, and it is not a limit per address the caller invents. Off Vercel, or when that header is absent, there is no shared counter. A shared network shares one platform address, so those people share that counter. `waitlist_rate` stores the hash and a count, not the email and not the address.

Checking the box is the consent. It covers recording that email as interest in Naive early access. It does not create an account. No mail is sent. `consent_at` is the server time of the first checked submission. A repeat does not change it and gets the same answer.

Set `NAIVE_WAITLIST_DATABASE_URL` on Vercel project `mentura-docs` only, for the environments that should accept enrollments. Use `sslmode=require`. The password stays in that variable. This repository does not set it.

## Retention and deletion

No retention period is decided. A row stays until an owner deletes it. The app role cannot delete. An owner, connected to `mentura_waitlist`, can run `delete from waitlist_interest where email = $1`. The project's point-in-time history is separate and is not an application retention policy.

The stored fields are the folded email, the time the interest was recorded, and the fixed product `naive-early-access`. The form does not ask for anything else. A repeat of the same address does not change the row and gets the same answer as the first time. The response does not contain the address. The handler does not write the address to the log.
