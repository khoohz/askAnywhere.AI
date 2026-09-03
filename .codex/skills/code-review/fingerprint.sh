#!/usr/bin/env bash
# Finding fingerprint — the shared identity of a review finding.
#
#   fingerprint.sh <path> <rule> <snippet>
#
# sha1(path|rule|normalized-snippet), first 7 chars. Line numbers are excluded on
# purpose: a finding must survive unrelated edits shifting it up or down the file,
# and must die when the flagged code itself changes.
#
# Ported from allocate-platform-monorepo, where the PR review workflows share this
# formula. This repo has no review bot, so the only consumers are the code-review
# and review-and-commit skills — but keeping one implementation means a finding
# keeps its identity across a re-run rather than re-asking the user.
#
# Source the file to get finding_fingerprint() directly.

# sha1sum on Linux/CI, shasum on macOS where developers run the skill.
if command -v sha1sum >/dev/null 2>&1; then
  FINGERPRINT_HASH=(sha1sum)
else
  FINGERPRINT_HASH=(shasum -a 1)
fi

finding_fingerprint() {
  local path="$1" rule="${2:-general}" snippet="${3:-}"
  local normalized="${snippet//$'\n'/ }"
  normalized="${normalized//$'\t'/ }"
  while [[ "$normalized" == *"  "* ]]; do normalized="${normalized//  / }"; done
  normalized="${normalized#" "}"
  normalized="${normalized%" "}"
  printf '%s|%s|%s' "$path" "$rule" "$normalized" | "${FINGERPRINT_HASH[@]}" | cut -c1-7
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  set -euo pipefail
  finding_fingerprint "${1:?usage: fingerprint.sh <path> <rule> <snippet>}" "${2:-general}" "${3:-}"
fi
