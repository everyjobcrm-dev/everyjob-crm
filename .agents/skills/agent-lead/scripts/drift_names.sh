#!/usr/bin/env bash
# Report live DB object names (one per line on stdin) that are never mentioned under a directory.
# usage: <names> | drift_names.sh [dir=supabase]
set -euo pipefail
dir=${1:-supabase}
missing=0
while IFS= read -r n; do
  [ -z "$n" ] && continue
  if ! grep -rqw -- "$n" "$dir"; then echo "DRIFT  $n"; missing=$((missing+1)); fi
done
echo "$missing name(s) live but not in $dir/"
