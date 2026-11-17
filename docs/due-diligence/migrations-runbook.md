# Migrations runbook

State checked on 2026-11-17 against the live project `yjgqunrboxihxtgkxibw` (Supabase MCP `list_migrations`).

## 1. Where the schema history stands

| Group | Count | Status |
|---|---|---|
| Versions in the live history table **and** in `supabase/migrations/` | 7 | in sync (c1, c2, c4, c5, c6a, c6b, d1) |
| Files in `supabase/migrations/` applied by hand, **missing from the live history** | 9 | fix with step 2 |
| Versions in the live history with **no file** in `supabase/migrations/` (Oct 2026, applied through the MCP; sources are the `supabase/p*_*.sql` files) | 36 | fix with step 3 |
| Changes applied by hand with no history row (M1d, M1e, M6a, M6c and other `DROP` migrations; see `supabase/live_snapshot/README.md`) | several | covered by the baseline in step 4 |
| Schema created before 2026-10-11 (dashboard) | — | covered by the baseline in step 4 |

Consequence: replaying `supabase/migrations/` from zero does **not** rebuild the database. A fresh production
database is built from a schema baseline (step 4), not from replay.

## 2. Record the 9 hand-applied migrations (owner)

```bash
npx supabase migration repair --status applied 20261110100000 20261110100100 20261110100200 20261110100300 20261110100400 20261110100500 20261113100000 20261114100000 20261114110000 --linked
```

## 3. Bring the 36 remote-only versions into the repo (owner)

```bash
npx supabase migration fetch --linked
```
This writes one file per version from the statements stored in the history table into `supabase/migrations/`.
Review the diff and commit it. Afterwards `npx supabase migration list --linked` should show local = remote for
every row.

## 4. Baseline for a fresh database (dev, before production launch)

```bash
npx supabase db dump --linked -f supabase/baseline/schema.sql          # public schema: tables, views, functions, RLS
npx supabase db dump --linked --role-only -f supabase/baseline/roles.sql
```
Production setup (Stage 5): create the new project, run `roles.sql` and `schema.sql`, mark every existing version
as applied with `migration repair`, then apply only migrations newer than the baseline. Check the result with the
Security Advisor and run `supabase/tests/` against it.

Never dump data from the shared project into the repository: it contains personal data (national IDs, phones).
