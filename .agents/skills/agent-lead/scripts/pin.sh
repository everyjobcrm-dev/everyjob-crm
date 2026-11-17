#!/usr/bin/env bash
# Pin files for an approval line: sha256 and assertion counts, read from git (not the working copy).
# usage: pin.sh <git-ref> <path>...   e.g. pin.sh origin/main supabase/p9.sql supabase/tests/p9_tests.sql
# Assertion count = occurrences of PIN_PATTERN (default: result rows appended as "v_res := v_res ||",
# which counts inline checks too - counting helper calls missed 3 of 51 once). Set per project in lead-profile.md.
set -euo pipefail
ref=${1:?usage: pin.sh <git-ref> <path>...}; shift
pat=${PIN_PATTERN:-'v_res := v_res \|\|'}
echo "ref $(git rev-parse --short "$ref")"
for p in "$@"; do
  body=$(git show "$ref:$p")
  sha=$(printf '%s\n' "$body" | sha256sum | cut -d' ' -f1)
  n=$(printf '%s\n' "$body" | grep -oE "$pat" | wc -l)
  drop=$(printf '%s\n' "$body" | grep -vE '^\s*--' | grep -ciE '\bdrop\b' || true)
  del=$(printf '%s\n' "$body" | grep -vE '^\s*--' | grep -ciE '\bdelete\b' || true)
  echo "$p  sha256=$sha  assertions=$n  DROP(uncommented)=$drop  DELETE=$del"
done
