# Ponytail discipline (adapted)

Adapted from **Ponytail** by Dietrich Gebert, MIT License — https://github.com/DietrichGebert/ponytail
(`skills/ponytail`, `skills/ponytail-review`, `skills/ponytail-debt`). Condensed for use inside agent
prompts; the project's AGENTS.md deny-list and closed decisions override anything here.

Why it is in every prompt: the upstream benchmark (39 tasks × 5 runs, same agent with/without) reports
about half the code, ~40% less time, ~25% lower cost, and *more* risky logic shipped with a test. Smaller
diffs are also cheaper for the lead to verify, which is where rounds are lost.

## Levels -> when the lead picks them

| Level | Agent behaviour | Use when |
|---|---|---|
| `lite` | build what was asked; name the smaller option in one line | the owner specified the shape exactly (a decided UI, an approved SQL file) |
| `full` (default) | smallest complete change, checks where logic needs them | normal feature / fix rounds |
| `ultra` | before building, push back on any part the need doesn't justify | vague requests, scope creep, "is this critical?" answered "no" but the owner still wants it |

`ultra` never reopens a closed decision or the deny-list — it questions *scope*, not settled product rules.

## Block to paste into agent prompts

```text
PONYTAIL DISCIPLINE (level: full)
- Before writing: read the task and the code it touches; list every place the change must reach
  (callers, tests, fixtures, config, exports, types). That list is the scope; extra features are not.
- Take the first option that fully works: (1) does it need to exist? skip unrequested features and name
  them in one line; (2) already in this codebase? reuse it the way surrounding code does; (3) platform /
  stdlib feature; (4) an installed dependency - never add a dependency for a few lines; (5) one readable
  line; (6) otherwise the minimum code that works.
- Lazy about the solution, never about the change: finish every caller, test and fixture the change breaks.
- No abstraction, wrapper, option, config or "for later" code nobody asked for. Deletion beats addition.
  Keep the codebase's existing layers and conventions.
- Bug fix: grep every caller first, fix the root cause once in the shared code.
- Moved/merged code keeps its error handling and validation.
- New non-trivial logic (branch, loop, parser, money, security, data writes) leaves one small test or
  self-check. Trivial changes need none.
- A deliberate shortcut gets a comment: `shortcut: <the limit>, <when to upgrade>`.
- Never cut: validation at trust boundaries, error handling that prevents data loss, security,
  accessibility, anything the task asked for, anything AGENTS.md requires.
- End the final report with one or two lines: what you skipped or did not check, and any risk.
```

## Review shape (lead's analysis section)

Order of importance: correct, safe, holds under load, tested, fast, lean. Every finding needs a concrete
case ("this input/situation leads to this wrong result") — no case, no finding. Re-read the code to
confirm the caller exists / the value can be empty / the code is unused before reporting.

Groups (skip empty ones), numbered across groups so the owner can say "fix 2 and 5":
- **Must fix** = the blocker test (security, data loss, broken flow, decision/deny-list conflict,
  irreversible DB change) — at most 5.
- **Should fix / Nice to have** -> collapse into the one-line backlog list.

Each Must-fix finding has four short parts: **what this is**, **problem**, **fix** (smallest, prefer
deletion), **if we skip it**. End with `Verdict: מאושר / Approved` or `Verdict: fix 1 and 3 first`, and
`Not checked:` one line when something mattered and could not be checked.

A `shortcut:` comment that names its limit is a decision, not a finding — unless the expected load
already crosses it.

## Debt ledger (`debt` mode)

```bash
git grep -nE '(#|//|/[*]|--) ?(shortcut|ponytail):'
```
One row per hit: `<file>:<line>, <what was simplified>. ceiling: <limit>. upgrade: <trigger>.` Tag rows
with no upgrade trigger `no-trigger` (those rot). Merge with the state file's backlog section; end with
`<N> markers, <M> with no trigger.`
