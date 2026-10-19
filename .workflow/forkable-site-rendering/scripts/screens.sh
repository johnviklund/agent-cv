#!/usr/bin/env bash
# Usage: screens.sh <before|after> [base-url]  — viewport JPEGs of the ten routes at 1280x800 and 375x812.
set -euo pipefail
phase=$1; base=${2:-http://localhost:8788}
out="$(dirname "$0")/../screens"; tmp=$(mktemp -d)
routes=("home:/" "about:/about/" "experience:/experience/" "projects:/projects/" "cv:/cv/" "contact:/contact/" "privacy:/privacy/" "application:/application/" "admin:/admin/" "404:/no-such-page")
for entry in "${routes[@]}"; do
  name=${entry%%:*}; path=${entry#*:}
  for size in 1280,800 375,812; do
    label=$([ "$size" = 1280,800 ] && echo desktop || echo mobile)
    chromium --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$tmp/profile" \
      --window-size="$size" --virtual-time-budget=4000 --screenshot="$tmp/shot.png" "$base$path" >/dev/null 2>&1
    magick "$tmp/shot.png" -quality 80 "$out/T6-$name-$label-$phase.jpg"
  done
done
rm -rf "$tmp"
