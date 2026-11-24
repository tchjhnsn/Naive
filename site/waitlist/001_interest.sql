-- Waitlist interest. Not an account, not identity, and not the tenant record store.
-- Apply on database mentura_waitlist only, as the owner. Do not apply on mentura_identity or neondb.
-- This file does not create a role and does not grant privileges.
-- Relations, types, and functions are schema-qualified. The enrollment function does not follow
-- the caller's search path, so a temporary table cannot stand in for the real tables.

set search_path = pg_catalog, public;

create table if not exists public.waitlist_schema_migration (
  id pg_catalog.text primary key,
  applied_at pg_catalog.timestamptz not null default pg_catalog.now()
);

create table if not exists public.waitlist_interest (
  email pg_catalog.text primary key,
  consent_at pg_catalog.timestamptz not null,
  product pg_catalog.text not null,
  constraint waitlist_interest_email_len check (pg_catalog.char_length(email) between 3 and 254),
  constraint waitlist_interest_email_text check (email !~ '[[:cntrl:]]' and email = pg_catalog.lower(email)),
  constraint waitlist_interest_product check (product = 'naive-early-access')
);

create table if not exists public.waitlist_rate (
  id pg_catalog.text primary key,
  hits pg_catalog.int4 not null,
  window_start pg_catalog.timestamptz not null,
  constraint waitlist_rate_hits check (hits >= 0)
);

-- p_bucket is a hash of a platform client address, or null when no trusted address exists.
-- A null bucket does not share one counter across everyone.
-- pg_temp is listed last so it is not searched ahead of pg_catalog. The body never uses it.
create or replace function public.waitlist_enroll(p_email pg_catalog.text, p_bucket pg_catalog.text) returns pg_catalog.text
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  n pg_catalog.int4;
begin
  if p_bucket is not null and pg_catalog.char_length(p_bucket) between 16 and 128 then
    insert into public.waitlist_rate (id, hits, window_start) values (p_bucket, 1, pg_catalog.now())
    on conflict (id) do update set
      hits = case
        when public.waitlist_rate.window_start < pg_catalog.now() - '10 minutes'::pg_catalog.interval then 1
        else public.waitlist_rate.hits + 1
      end,
      window_start = case
        when public.waitlist_rate.window_start < pg_catalog.now() - '10 minutes'::pg_catalog.interval then pg_catalog.now()
        else public.waitlist_rate.window_start
      end
    returning hits into n;
    if n > 30 then
      return 'limited';
    end if;
  end if;
  insert into public.waitlist_interest (email, consent_at, product)
  values (p_email, pg_catalog.now(), 'naive-early-access')
  on conflict (email) do nothing;
  return 'recorded';
end;
$$;

insert into public.waitlist_schema_migration (id) values ('001_interest.sql')
on conflict (id) do nothing;
