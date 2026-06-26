-- Grant service_role full access to all public tables so it can be used for
-- admin operations (scheduled cleanup, integration tests, etc.) via PostgREST.
-- service_role already has BYPASSRLS; this adds the table-level privileges that
-- PostgREST enforces independently of RLS.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
