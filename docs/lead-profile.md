# Lead profile - everyJob CRM

Read by the `agent-lead` skill at the start of a session. Hard rules: `AGENTS.md` (§8 wins over everything).
State, roadmap, backlog: `docs/handoff.md`. This file holds only owner preferences, environments and
conventions; do not copy AGENTS.md rules here.

## Owner
- Yosef, engineer. Explanations in Hebrew, direct and short; prompts to the agent in English, one code block.
- Shell: PowerShell on Windows. Local repo: `C:\Users\samoh\Documents\everyjob-crm`, tests on localhost.
  After every change: `git fetch`, checkout, `npm install`, delete `.next`, `npm run dev`; log out/in after a role change.
- Local `master` has unpushed `9c13cb6 "part 1"` (backup `backup-part1`) - never merge it without asking.
- `core.autocrlf=true` -> working copies are CRLF; hash and pin from `git show`.

## Environments
| Thing | Value |
|---|---|
| Repo / default branch | `everyjobcrm-dev/everyjob-crm`, `master` |
| Supabase | `yjgqunrboxihxtgkxibw` - single project, demo users only, no branching; real email verification |
| Vercel | team `everyjob-crm-dev`, project `everyjob-crm` |

## Demo users (all `samohayosef…@gmail.com`, verified)
| User | Role | Notes |
|---|---|---|
| `samohayosef@` | admin | the owner |
| `+mgr` | manager | |
| `+rec1` | recruiter | `can_create_events = true` |
| `+rec2` | recruiter | no create permission |
| `+emp1` | employee | `recruited_by` = rec1 |
| `+emp2` | employee | |
| `+minor` | employee | under 18 |

## Closed decisions not spelled out in AGENTS.md
- One app shell for every role (employee items + a "ניהול" group for staff); "אירוע חדש" is a button on the events
  list, not a nav item.
- Admin/Manager pick a "מגייס/ת אחראי/ת" on create and edit; a recruiter creating an event owns it (live guard
  `guard_event_recruiter_ownership` already enforces this - no trigger change needed).
- Date/time change with registrants: registrations are kept; the UI warns with the count; no automatic notification
  (backlog).
- Hours: one admin approves, no two-person rule.

## Approval conventions
- Migration ids by phase/step (`p9_e0`, `h6v2`...). Approval line `approve <ids>`; pasting the prompt is the approval.
- Long SQL pinned by `git show <sha>:<path>` + sha256 (`.agents/skills/agent-lead/scripts/pin.sh`); SQL the owner runs
  by hand is pasted in full.
- DROP, and bodies the MCP declines (e.g. containing DELETE), are run by the owner in the SQL Editor; the agent
  verifies read-only and records them in `supabase/live_snapshot/README.md`.
- Test files: assertion count = `v_res := v_res ||` rows (pin.sh default).

## Status probes (read by `scripts/status.sh` and the status card)
- Base branch: `claude/hopeful-gates-rtzhto-01c57f`
- State file: `docs/handoff.md`
- DB expected live (read-only check of existence, SECURITY DEFINER, no anon EXECUTE): `list_staff_recruiters`,
  `update_event_details`, `upsert_event_role`, `remove_event_role`, `submit_shift_hours`, `approve_shift_hours`,
  `redeem_recruiter_credits`, `request_registration_cancellation`.
- Deploy: Vercel project `everyjob-crm` - latest Production and Preview deployment state; env var names only.
- Open PRs on the repo (GitHub MCP), PR #4 base `claude/hopeful-gates-rtzhto`.

## Stack modules
- `stack-supabase`, `stack-nextjs-vercel`.

## Decisions log
- 2026-10-15 Base branch for consolidated work: `claude/hopeful-gates-rtzhto-01c57f`.
- 2026-10-16 P9 (E0-E3) approved and applied; E3 by the owner in the SQL Editor.
- 2026-10-16 Polish round (confirm click, admin recruiter column, .gitattributes) deferred; next is browser verification.
- 2026-10-16 Lead workflow: one general `agent-lead` skill + this per-project profile (not a skill per project);
  ponytail discipline (MIT) embedded in agent prompts.
