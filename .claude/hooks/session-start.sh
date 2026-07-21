#!/bin/bash
# SessionStart hook for Claude Code on the web. Remote containers lack the
# pinned Node (.nvmrc); the shared cloud setup script provisions it, persists
# PATH via CLAUDE_ENV_FILE, and installs deps. Local sessions are skipped.
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi
exec "${CLAUDE_PROJECT_DIR:-.}/scripts/setup-cloud.sh"
