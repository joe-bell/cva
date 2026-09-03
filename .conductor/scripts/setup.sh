#!/bin/bash
# Conductor workspace setup (scripts.setup in .conductor/settings.toml).
# Local: link env files, put the pinned Node + corepack pnpm on PATH, install.
# Cloud: provision the pinned Node via the shared cloud setup script.
if [ "${CONDUCTOR_IS_LOCAL:-1}" != "0" ]; then
  "$(git rev-parse --show-toplevel)/scripts/setup-worktree.sh" || exit $?
  . "$(git rev-parse --show-toplevel)/scripts/setup-node.sh" || exit $?
  # --frozen-lockfile: a fresh workspace starts from the remote branch, so
  # this is the more reproducible choice here too (matches setup-cloud.sh).
  exec pnpm install --frozen-lockfile
fi
exec "${CONDUCTOR_WORKSPACE_PATH:-.}/scripts/setup-cloud.sh"
