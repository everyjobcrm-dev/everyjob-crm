# Lead profile template -> save as `docs/lead-profile.md` in the project repo

Keep it short (under ~120 lines). Facts that change daily belong in the state file, not here.
AGENTS.md stays the source of hard rules; do not copy its rules here, point to them.

```markdown
# Lead profile - <project>

## Owner
- Name / role: <...>. Language for explanations: <Hebrew>. Prompts to the agent: English.
- Shell for commands: <PowerShell on Windows>. Local repo path: <C:\...>. Local test URL: <localhost:3000>.
- Local quirks: <unpushed commits, backup branches - never merge without asking>.

## Sources
- Hard rules: AGENTS.md (deny-list §<n> wins). State + roadmap + backlog: <docs/handoff.md>.
- Specs: <docs/spec-full.md>. Test plans: <docs/manual-test-plan-*.md>.

## Environments
| Thing | Value |
|---|---|
| Repo / default branch | <owner/repo>, <master> |
| DB project | <id> (single project? demo data only?) |
| Deploy | <team / project ids> |

## Demo users (roles for browser tests)
| User | Role | Notes |

## Closed decisions not written in AGENTS.md
- <decision> (<date>)

## Approval conventions
- Migration ids: <p9_e0 style>. Approval line: `approve <ids>`; pasting the prompt is the approval.
- Who runs DROP / blocked statements: the owner, in <SQL Editor>.

## Status probes (read by scripts/status.sh and the status card)
- Base branch: `<branch>`
- State file: `<docs/handoff.md>`
- DB expected live: `<fn1>`, `<fn2>` (checked read-only: exists, SECURITY DEFINER, no anon EXECUTE)
- Deploy: <platform / project> - Production + Preview state; env var names: <NAMES>
- PRs: <which PRs matter>

## Stack modules to load
- stack-supabase, stack-nextjs-vercel

## Decisions log (append one line per owner decision)
- <date> <decision> (<round / context>)
```
