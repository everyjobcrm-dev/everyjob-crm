#!/usr/bin/env bash
# Read-only project status scan for the agent-lead skill. Changes nothing (fetch only).
# usage: status.sh [repo-dir=.]   reads docs/lead-profile.md ("Base branch:" / "State file:" lines) if present.
set -uo pipefail
cd "${1:-.}" || exit 1
prof=docs/lead-profile.md
field() { [ -f "$prof" ] && grep -m1 -oP "^- $1: \`\K[^\`]+" "$prof"; }
state=$(field 'State file'); state=${state:-docs/handoff.md}
base=$(field 'Base branch')
git fetch -q --prune origin 2>/dev/null || echo "WARN fetch failed (offline or no access) - origin data may be stale"
def=$(git symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##'); def=${def:-master}
base=${base:-$def}

echo "## git"
echo "current: $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)  dirty_files=$(git status --porcelain | wc -l)"
up=$(git rev-parse --abbrev-ref '@{u}' 2>/dev/null) && echo "unpushed commits on current: $(git rev-list --count "$up..HEAD")"
if git rev-parse -q --verify "origin/$base" >/dev/null; then
  echo "base: $base @ $(git rev-parse --short "origin/$base") $(git log -1 --format='%cs %s' "origin/$base")"
  echo "base vs $def: ahead $(git rev-list --count "origin/$def..origin/$base"), behind $(git rev-list --count "origin/$base..origin/$def")"
else
  echo "WARN base branch '$base' not on origin"
fi
echo "newest origin branches (ahead/behind base):"
git for-each-ref --sort=-committerdate refs/remotes/origin --format='%(refname:short) %(committerdate:short)' | grep -v 'origin/HEAD' | head -8 |
while read -r b d; do
  n=${b#origin/}; [ "$n" = "$base" ] && { echo "  $d $n  (base)"; continue; }
  a=$(git rev-list --count "origin/$base..$b" 2>/dev/null); z=$(git rev-list --count "$b..origin/$base" 2>/dev/null)
  echo "  $d $n  +$a/-$z$([ "${a:-0}" -gt 0 ] && echo '  <- has commits not in base')"
done

echo "## state file: $state"
if git cat-file -e "origin/$base:$state" 2>/dev/null; then
  echo "last updated: $(git log -1 --format='%cs %h %s' "origin/$base" -- "$state")"
  echo "roadmap (first item without 'Done' = current milestone):"
  git show "origin/$base:$state" | awk '/^## .*[Rr]oadmap/{f=1;next} /^## /{f=0} f && /^[0-9]+\./' | cut -c1-140 | sed 's/^/  /'
  since=$(git log -1 --format=%H "origin/$base" -- "$state")
  echo "changed under supabase/ since the state file was updated (check applied/recorded):"
  git diff --name-only "$since" "origin/$base" -- supabase | sed 's/^/  /' | grep . || echo "  none"
else
  echo "WARN $state not found on origin/$base"
fi

echo "## tests (from origin/$base)"
for f in $(git ls-tree -r --name-only "origin/$base" -- supabase/tests 2>/dev/null | grep '\.sql$'); do
  echo "  $f  assertions=$(git show "origin/$base:$f" | grep -oE "${PIN_PATTERN:-v_res := v_res \|\|}" | wc -l)"
done

echo "## backlog markers in code"
echo "  shortcut: comments = $(git grep -nE '(#|//|/[*]|--) ?(shortcut|ponytail):' "origin/$base" 2>/dev/null | wc -l)"
