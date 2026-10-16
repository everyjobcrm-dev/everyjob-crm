# Verifying agent claims

Rule: a claim is ✅ only with evidence you produced yourself this round. Prefer one query that checks
several claims at once. Everything here is read-only.

## Git

```bash
git fetch --prune origin
git for-each-ref --sort=-committerdate refs/remotes/origin --format='%(committerdate:short) %(refname:short) %(subject)' | head -10
git log --oneline -5 origin/<base>                # claimed SHAs really pushed?
git diff --stat <old>..origin/<base>              # claimed file list == actual?
git diff <old>..origin/<base> -- <file>           # read the risky hunks, not just the stat
git show origin/<base>:<path> | file -            # encoding / line endings of committed file
git ls-files --eol | awk '{print $1}' | sort | uniq -c   # index line endings (all i/lf is good)
scripts/pin.sh origin/<base> <path>...            # sha256 + assertion counts from git
```

## Postgres / Supabase (read-only SQL)

Function exists, security mode, search_path, grants, anon access:
```sql
SELECT p.proname, pg_get_function_identity_arguments(p.oid) args, p.prosecdef, p.proconfig, p.proacl::text,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       md5(replace(pg_get_functiondef(p.oid), E'\r', '')) AS def_md5
  FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN (<names>) ORDER BY 1;
```
Triggers on tables (order matters: BEFORE triggers fire alphabetically):
```sql
SELECT c.relname, t.tgname, pg_get_triggerdef(t.oid), p.proname, p.prosecdef
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE NOT t.tgisinternal AND c.relname IN (<tables>) ORDER BY 1, 2;
```
Policies:
```sql
SELECT tablename, policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename IN (<tables>);
```
FK delete rules (CASCADE changes what a delete-guard must check):
```sql
SELECT conrelid::regclass, conname, confdeltype, pg_get_constraintdef(oid)
  FROM pg_constraint WHERE contype = 'f' AND confrelid = '<schema.table>'::regclass;
```
Enum labels (status checks must match the real values):
```sql
SELECT enumlabel FROM pg_enum WHERE enumtypid = '<type>'::regtype ORDER BY enumsortorder;
```
Live body vs committed body: compare whitespace-normalised md5 of `prosrc` with the `$function$` body
extracted from `git show <sha>:<path>`; report CRLF separately (harmless in PL/pgSQL, but explains md5 drift).

Test residue after a rolled-back test: `SELECT count(*) FROM auth.users WHERE email LIKE '<prefix>%';` -> 0.

## Drift check (session start)

1. List live objects: functions, views, triggers, policies in `public`.
2. `scripts/drift_names.sh` with those names on stdin -> names never mentioned under `supabase/` are drift
   (live but uncommitted) -> backlog item "snapshot to `supabase/live_snapshot/`" unless already there.
3. Compare the state file's "live" list against step 1; any difference is a finding.

## Deploy (Vercel or similar)

Env vars per environment by name only (never print values); last deployment state per environment;
runtime errors since the last deploy. Changing env vars or secrets is the owner's action.

## What does NOT count as verification

- the agent's own report, screenshots described in text, "should work";
- tests run as postgres/superuser/service_role for permission behaviour;
- a count copied from a previous prompt (recount with `pin.sh`);
- a hash computed on a CRLF working copy.
