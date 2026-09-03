#!/bin/sh
# Put the pinned node + corepack pnpm on PATH, then exec the given command.
# `exec` replaces this shell so Conductor's stop signal reaches the command
# directly rather than a wrapper that could leave it orphaned.
. "$(git rev-parse --show-toplevel)/scripts/setup-node.sh"
exec "$@"
