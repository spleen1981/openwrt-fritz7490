#!/usr/bin/env bash
set -e
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
for file in .secrets/*; do
  name=$(basename "$file")
  echo "Setze Secret: $name"
  if [[ $(wc -l < "$file") -gt 1 ]]; then
    base64 -w0 "$file" | gh secret set "$name" --repo "$REPO"
  else
    cat "$file" | gh secret set "$name" --repo "$REPO"
  fi
done
