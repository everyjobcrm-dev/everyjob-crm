@AGENTS.md

# Claude Code notes

AGENTS.md (imported above) is the source of truth. This file only adds Claude Code mechanics and never overrides it. If AGENTS.md, this file and any `docs/*` disagree, stop and ask.

## Connected tools
- **Supabase MCP:** read-only use only (`list_tables`, `list_migrations`, `get_advisors`, `query_logs`, `generate_typescript_types`, `SELECT` through `execute_sql`). Never call `apply_migration`, `deploy_edge_function`, branch create/merge/reset/rebase, `pause_project`, or `execute_sql` with DDL/DML (AGENTS §5.6, §8.1). Never `SELECT` from the Form 101 / bank tables (§8.2).
- **Vercel MCP:** read deployments, build logs and runtime logs freely. Anything that changes state is AGENTS §8.6.

## Porting earlier work
Earlier work lives uncommitted in local branch `backup/before-restore-2026-10-12`: status control, event edit, cancel/restore, roster, and the employees directory.
- Port it one slice at a time with `git show <branch>:<path>` or `git checkout <branch> -- <path>`. Don't rewrite it from scratch.
- The branch also holds unrelated old WIP. Port only the slice the task names, and diff each file against the current one before taking it.
- Run `npm run typecheck` after each slice and commit each slice separately.
- Delete this section once the port is done.

## Token economy
- Open only the files the task needs. No repo-wide audits and no `npm run build` unless asked.
- Keep final replies under 200 words: what changed, what you verified, and what manual verification is still needed.
