-- Privileges for the enrollment role. Run this while connected to mentura_waitlist, as the owner.
-- Create the role first. This file does not set a password and does not grant connect on any other database.
-- The role may call public.waitlist_enroll. It cannot read or remove addresses.
-- Names are schema-qualified. This file does not revoke TEMP. The function stays safe while TEMP remains granted.

set search_path = pg_catalog, public;

revoke all on function public.waitlist_enroll(pg_catalog.text, pg_catalog.text) from public;
grant execute on function public.waitlist_enroll(pg_catalog.text, pg_catalog.text) to mentura_waitlist;
revoke all on table public.waitlist_interest from public;
revoke all on table public.waitlist_rate from public;
revoke all on table public.waitlist_schema_migration from public;
revoke all on table public.waitlist_interest from mentura_waitlist;
revoke all on table public.waitlist_rate from mentura_waitlist;
revoke all on table public.waitlist_schema_migration from mentura_waitlist;
