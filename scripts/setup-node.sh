#!/bin/sh
# Put the repo's pinned Node (.nvmrc) and corepack-managed pnpm on PATH.
#
# Source (don't execute) from non-interactive entry points that need
# node/pnpm but don't load nvm from an interactive shell profile — git hooks,
# Conductor, and other agent shells:
#
#   . "$(git rev-parse --show-toplevel)/scripts/setup-node.sh"
#
# Prefer the exact runtime provisioned by setup-cloud.sh. Otherwise use nvm
# when available; machines on asdf/system node remain unaffected.

# Resolve the repo root so `nvm use` reads the right .nvmrc regardless of CWD.
_ensure_node_root=$(git rev-parse --show-toplevel 2>/dev/null) || _ensure_node_root=$PWD

# Major only: tolerate `24`, `v24`, `24.x.y` and take just the major.
_ensure_node_major=$(sed -n 's/^v\{0,1\}\([0-9][0-9]*\).*/\1/p' "$_ensure_node_root/.nvmrc" 2>/dev/null)
_ensure_node_cloud_dir="$HOME/.local/share/node/v${_ensure_node_major}"

# A file-exists-and-executable-bit check isn't enough: a stale or
# foreign-architecture binary (e.g. leftover debris from a different host)
# can have the bit set but fail to run — actually invoke it.
_ensure_node_cloud_dir_usable=false
if [ -n "$_ensure_node_major" ] && [ -x "$_ensure_node_cloud_dir/bin/node" ] \
  && "$_ensure_node_cloud_dir/bin/node" -v >/dev/null 2>&1; then
  _ensure_node_cloud_dir_usable=true
  export PATH="$_ensure_node_cloud_dir/bin:$PATH"
fi

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ "$_ensure_node_cloud_dir_usable" != true ] && [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  # nvm accepts a bare major, so the raw .nvmrc contents work as-is.
  nvm use --silent "$(cat "$_ensure_node_root/.nvmrc" 2>/dev/null)" >/dev/null 2>&1 \
    || (cd "$_ensure_node_root" && nvm use --silent >/dev/null 2>&1) \
    || true
fi

# Activate the `packageManager` shim (no-op if already enabled / absent).
command -v corepack >/dev/null 2>&1 && corepack enable >/dev/null 2>&1 || true
