# Stack module: Supabase / Postgres

Load when the project uses Supabase or Postgres with RLS.

## SQL review checklist (apply to every proposed function / trigger / policy)

- **NULL-safe:** `NOT IN (...)` with a NULL never matches -> use `COALESCE` or `IS DISTINCT FROM`.
  `x <> y` with NULL is NULL, not true.
- **SECURITY DEFINER:** `CREATE OR REPLACE FUNCTION` resets attributes you don't restate -> restate
  `SECURITY DEFINER` and `SET search_path` explicitly. `REVOKE ... FROM PUBLIC, anon` (Supabase grants
  anon EXECUTE on new public functions by default), then `GRANT` to the roles that need it.
- **Trigger order:** BEFORE triggers on the same event fire alphabetically by name. Columns maintained by a
  trigger break an allow-list guard that compares NEW to OLD.
- **UPDATE through RLS** needs a SELECT policy too. Dropping a `FOR ALL` policy also drops its SELECT.
- **Lock order:** pick one global order (e.g. parent FOR SHARE -> child FOR UPDATE -> grandchild) and make
  every write path follow it; a function that takes the parent FOR UPDATE first is fine (it blocks earlier).
- **Guard triggers** are INVOKER and skip only when `current_user NOT IN ('anon','authenticated')`; a
  DEFINER RPC bypasses them on purpose — so the RPC must re-implement every rule the guard enforces.
- **Allow-list, not deny-list** (patch keys, updatable columns, status transitions).
- **Joins that duplicate rows** (one-to-many history/report tables): use `LATERAL` on the latest
  non-voided row.
- **FK `ON DELETE CASCADE`:** a delete guard ("no children") must run under a lock that every child-insert
  path also takes, or the cascade can silently delete a row inserted concurrently.
- **Enum values:** status checks must use the enum's real labels (query `pg_enum`); a typo is just "false".
- **Casts from jsonb/text** (`::date`, `::uuid`) raise 22007/22P02 — map them or validate first.
- **PL/pgSQL identifiers are case-insensitive** — `u` and `U` are the same variable; avoid collisions with
  column names (prefix `v_` / `p_`).
- **Before replacing:** snapshot the live definition to a `*_v1_live.sql` rollback file and `diff` against it.
- **Behaviour tests** run impersonated (`SET LOCAL ROLE authenticated` + `request.jwt.claims`) inside a
  transaction / DO block that always ends in an exception, then prove nothing persisted. Tests as postgres
  prove nothing about permissions. Fixtures must not collide with live data (unique columns like national
  IDs, phones, emails) — derive them from a base that live data can't use.

## Operational quirks

- The Supabase MCP hangs on statements containing `DROP` (apply_migration and execute_sql) -> the owner runs
  them in the SQL Editor with `IF EXISTS`; the agent verifies read-only afterwards. Test scripts never DROP.
- `apply_migration` may be **declined by the tool permission layer** when a function body contains
  `DELETE` -> treat as STOP; the owner runs that block in the SQL Editor; the agent verifies and records it as
  hand-applied (it won't appear in `schema_migrations`).
- Blocks pasted from a Windows working copy land in the DB with CRLF — harmless, but normalise
  (`replace(..., E'\r', '')`) before md5 comparisons.
- One migration per file under `supabase/`, rollback included; apply one at a time.
- Regenerate types after every schema change with the MCP generator (or CLI from bash / PowerShell 7);
  commit UTF-8 + LF; verify with `file`.
- Single shared project with demo users only? Then every test must roll back; there is no branch DB.
