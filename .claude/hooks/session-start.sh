#!/bin/bash
# SessionStart hook: local sessions link env files from the primary checkout.
# Remote containers lack the pinned Node (.nvmrc), so the shared cloud setup
# script provisions it, persists PATH via CLAUDE_ENV_FILE, and installs deps.
set -euo pipefail

# Never run under GitHub Actions. claude-code-action restores `.claude/` from
# the base branch, so this file is trusted — but `scripts/` is NOT on that
# restore list, and on a pull request the working tree sits at the PR head.
# Exec'ing scripts/ from here would run a contributor's shell with the job's
# write-capable token, on nothing more than a maintainer typing `@claude`.
# The workflow provisions its own toolchain, so there is nothing to do here.
if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  exit 0
fi

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  "${CLAUDE_PROJECT_DIR:-.}/scripts/setup-worktree.sh"
  exit 0
fi
exec "${CLAUDE_PROJECT_DIR:-.}/scripts/setup-cloud.sh"
