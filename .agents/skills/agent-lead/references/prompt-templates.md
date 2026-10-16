# Prompt templates

Fill the `<...>` slots. Keep every template inside ONE code block when sent. Delete parts that don't
apply rather than leaving them empty. Paste the PONYTAIL block from `ponytail-discipline.md` where marked.

## T1. Apply migration(s) + finish feature

```text
ROLE: implementing agent on <project>. AGENTS.md is authoritative; its deny-list overrides everything below.
Round <k>/<N> of milestone <name>.

APPROVAL (pasting this prompt is the owner's explicit confirmation, scoped exactly to this):
approve <id1> <id2>
= <what each id is>, exactly as committed in <path> at <sha>, file sha256 <hash> (hash from `git show`, not the
working copy). Nothing else is approved. Rollback lines containing DROP are not to be run by you.

STEP 0 - base: git fetch --prune; list newest origin branches; if a newer branch touches <paths>, STOP.
  Check out <base>; verify HEAD contains <sha> and the sha256 above.
STEP 1 - pre-check (read-only): <objects must not exist / dependencies must exist and be SECURITY DEFINER>.
STEP 2 - apply one at a time, in order <ids>. After EACH: read-only verification of <security mode,
  search_path, grants, anon access>; print the row. Failure -> STOP before the next one.
STEP 3 - tests: <file> (sha256 <hash>, <count from pin.sh> assertions) -> expect <count>/<count>;
  regressions <files + counts>; then prove nothing persisted (<query>).
STEP 4 - types/app: regenerate types (<tool>, UTF-8, LF); typecheck, lint, build clean; <UI work>.
STEP 5 - docs: state file (<sections>), lessons, decisions log. Commit per step; push -u origin <base>. No PR.

<PONYTAIL DISCIPLINE block>

DEFINITION OF DONE: <ids> live and verified; tests <counts>; typecheck/lint/build clean; pushed SHA reported;
only <files/dirs> changed.

FAILURE RULES: <standard list from SKILL.md §3>.

FINAL REPORT: per migration: applied + verification row; test counts; checks; files changed; commits + pushed
SHA; manual verification still needed (by role); last line: skipped / not checked / risk.
```

## T2. UI / component work (no DB)

```text
TASK: <one sentence>. Base: <branch> @ <sha> (or a descendant you made). UI-only, unattended OK.
Files allowed: <list>. No migrations, no SQL writes, no permission-check changes.
STEPS: 1) <...> 2) <...>
Conventions: <from AGENTS.md: e.g. RTL logical classes, form generics, design tokens, copy language>.
<PONYTAIL DISCIPLINE block>
CHECKS: typecheck, lint (no new warnings), build; grep the diff for <forbidden patterns> -> none added.
GIT: one commit per step; push -u origin <branch>. No PR.
FAILURE RULES: needs DB / new RPC / permission change -> STOP and report; failure in untouched files -> report.
FINAL REPORT: commits + SHA, check results, behaviour description, manual checks list, skipped/risk line.
```

## T3. Fix after a failure

```text
CONTEXT: your last run stopped at <step> with <exact error>. State now: <what is applied / committed / pushed>.
Do NOT redo <done steps>.
DIAGNOSE FIRST (read-only): <the 1-3 checks that distinguish the hypotheses>. Report results before editing.
FIX: <smallest change at the root cause>; then re-run <the failing check> and <regressions>.
<PONYTAIL DISCIPLINE block>
FAILURE RULES: second failure of the same step -> STOP, report both errors, no third attempt.
FINAL REPORT: diagnosis result, fix diff summary, check results, SHA.
```

## T4. Resume after STOP

```text
RESUME <milestone> from <step>. What happened: <stop reason>. What the owner did since: <e.g. ran block X in
the SQL Editor>. Do NOT repeat <the declined/failed action>. Nothing new is approved.
STEP Nb - verify the owner's action read-only: <object, security mode, grants, body vs `git show <sha>:<path>`
(whitespace-normalised md5)>. Mismatch -> STOP with the diff.
Then continue <steps> exactly as in the original prompt, plus: <deltas, merged here, not beside the prompt>.
FAILURE RULES: unchanged; any further "declined" -> STOP, never retry.
FINAL REPORT: as original + the verification row of the resumed step.
```

## T5. Browser verification by role (owner runs it; agent prepares)

```text
TASK: prepare a manual test script for <feature> on <branch>. No code changes unless a check is impossible
to run (then report).
For each role <list demo users from lead-profile.md>: numbered steps, URL, action, expected result (Hebrew UI
text quoted), and which DB rule it exercises. Include negative cases (forbidden actions must be refused) and
the logout/login reminder after role changes. Write to <docs/manual-test-plan-*.md>, commit, push.
FINAL REPORT: path + SHA + count of checks per role.
```

## T6. Ship (PR + deploy)

```text
TASK: open a PR from <base> to <default branch>. Do not merge.
1) Merge <default branch> into <base> (merge commit, no rebase/force-push); resolve conflicts keeping <rules>;
   regenerate lockfiles/types with tooling; typecheck/lint/build.
2) PR body: what ships (by milestone), DB objects already live, manual test status, known backlog.
3) Deploy checklist (read-only on the platform; report, don't change secrets): env vars per environment
   <names>, which must NOT be set in production <names>.
4) Smoke-test plan on the preview URL by role.
FAILURE RULES: conflicts that lose behaviour on either side -> STOP and describe both sides.
FINAL REPORT: PR link, merge SHA, env checklist table, smoke plan.
```

## T7. Parallel agents

```text
AGENT A: branch <a>, owns <files>. AGENT B: branch <b>, owns <files>. Shared files: none (if unavoidable:
only A edits <file>; B requests changes in its report). Merge order: A then B; B merges A's branch in before
its final push. Each agent: fetch and check the other branch before pushing; never edit the other's files.
```
