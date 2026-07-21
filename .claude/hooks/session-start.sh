#!/bin/bash
# SessionStart hook: local sessions link env files from the primary checkout.
# Remote containers lack the pinned Node (.nvmrc), so the shared cloud setup
# script provisions it, persists PATH via CLAUDE_ENV_FILE, and installs deps.
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  "${CLAUDE_PROJECT_DIR:-.}/scripts/setup-worktree.sh"
  exit 0
fi
exec "${CLAUDE_PROJECT_DIR:-.}/scripts/setup-cloud.sh"
