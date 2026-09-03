#!/bin/bash
# Shared cloud provisioning + install script.
#
# Remote/cloud containers start from a generic image that does not have the
# Node version this repo pins (see `.nvmrc` / package.json `engines.node`).
# This script provisions the pinned Node, puts it on PATH (for this process
# and, where supported, for later shells), enables pnpm via corepack, and
# installs dependencies.
#
# Consumers (thin wrappers that own the "am I in the cloud?" guard):
#   - .claude/hooks/session-start.sh — Claude Code on the web (SessionStart)
#   - .conductor/scripts/setup.sh    — Conductor Cloud (scripts.setup)
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-${CONDUCTOR_WORKSPACE_PATH:-.}}"

# A file-exists-and-executable-bit check isn't enough: a stale or
# foreign-architecture binary (e.g. leftover debris, or a dir shared across
# machines) can have the bit set but fail to run — actually invoke it.
node_dir_is_usable() {
  [ -x "$1/bin/node" ] && "$1/bin/node" -v >/dev/null 2>&1
}

# --- Resolve the pinned Node major (prefer .nvmrc, fall back to engines) ---
required_major=""
if [ -f .nvmrc ]; then
  # Major only: tolerate `24`, `24.18.0`, `v24`; ignore aliases like `lts/iron`.
  required_major="$(sed -n 's/^v\{0,1\}\([0-9][0-9]*\).*/\1/p' .nvmrc)"
fi
if [ -z "$required_major" ] && [ -f package.json ]; then
  required_major="$(node -e 'try{const e=require("./package.json").engines||{};process.stdout.write(String(e.node||"").replace(/[^0-9].*$/,""))}catch{}' 2>/dev/null || true)"
fi
required_major="${required_major:-24}"

current_major="$(node -v 2>/dev/null | sed 's/^v//; s/\..*//' || echo 0)"

node_dir="$HOME/.local/share/node/v${required_major}"
if [ "$current_major" != "$required_major" ] && ! node_dir_is_usable "$node_dir"; then
  arch="$(uname -m)"
  case "$arch" in
    x86_64) arch=x64 ;;
    aarch64 | arm64) arch=arm64 ;;
  esac
  # Newest release for the required major, via the tiny latest-vN.x alias
  # (grepping the full dist index.json would download every release ever).
  version="$(curl --retry 3 -fsSL "https://nodejs.org/dist/latest-v${required_major}.x/SHASUMS256.txt" \
    | grep -o "node-v${required_major}\.[0-9.]*-linux" | head -1 \
    | sed 's/^node-//; s/-linux$//' || true)"
  # Fail loudly: continuing under the wrong Node major only defers to a
  # confusing package-manager engine error later.
  if [ -z "$version" ]; then
    echo "cloud-setup: could not resolve a Node v${required_major}.x release from nodejs.org (offline, blocked by network policy, or unreleased major?) — cannot provision the pinned Node" >&2
    exit 1
  fi
  echo "Installing Node ${version} (repo pins v${required_major})…"
  # Extract into a sibling temp dir and rename, so an interrupted download
  # can't leave a half-toolchain that later sessions mistake for installed.
  rm -rf "${node_dir}" "${node_dir}".partial.*
  tmp_dir="${node_dir}.partial.$$"
  tmp_archive="${tmp_dir}.tar.gz"
  mkdir -p "$tmp_dir"
  # .tar.gz, not .tar.xz: xz isn't preinstalled on every cloud base image
  # (e.g. Amazon Linux 2023), whereas gzip/tar -z is universal.
  if curl --retry 3 -fsSL \
    "https://nodejs.org/dist/${version}/node-${version}-linux-${arch}.tar.gz" \
    -o "$tmp_archive" \
    && tar -xzf "$tmp_archive" -C "$tmp_dir" --strip-components=1; then
    rm -f "$tmp_archive"
    mv "$tmp_dir" "$node_dir"
  else
    rm -rf "$tmp_dir" "$tmp_archive"
    echo "cloud-setup: Node ${version} download failed — cannot provision the pinned Node" >&2
    exit 1
  fi
fi

# Put the pinned Node on PATH for this process (subsequent tool calls
# included, when this script is sourced or its exports otherwise persisted).
if node_dir_is_usable "$node_dir"; then
  export PATH="$node_dir/bin:$PATH"
  path_line="export PATH=\"$node_dir/bin:\$PATH\""
  if [ -n "${CLAUDE_ENV_FILE:-}" ] && ! grep -qF "$path_line" "$CLAUDE_ENV_FILE" 2>/dev/null; then
    echo "$path_line" >> "$CLAUDE_ENV_FILE"
  fi
fi

# Also symlink provisioned tools into the conventional user bin directory, so
# *fresh* cloud agent shells (which won't inherit this process's PATH/env)
# find them after this script exits — this is what makes Conductor Cloud
# work, since it has no CLAUDE_ENV_FILE-style PATH persistence.
local_bin="$HOME/.local/bin"
mkdir -p "$local_bin"
if node_dir_is_usable "$node_dir"; then
  ln -sf "$node_dir/bin/node" "$local_bin/node" || true
  # npm/npx ship with Node itself (not corepack) — link them so workflows that
  # invoke npx directly resolve under the pinned Node in a fresh shell.
  for npm_tool in npm npx; do
    [ -x "$node_dir/bin/$npm_tool" ] && ln -sf "$node_dir/bin/$npm_tool" "$local_bin/$npm_tool" || true
  done
fi

# If the platform already ships the pinned major, provisioning is unnecessary,
# but the platform wrapper must remain to install dependencies (see AGENTS.md).
if [ "$current_major" = "$required_major" ]; then
  echo "Node v$current_major already matches the repo pin with no provisioning needed."
  echo "Keep the platform wrapper for dependency installation; once both platforms ship Node $required_major, remove only the provisioning logic from setup-cloud.sh — see AGENTS.md."
fi

echo "Using $(node -v) at $(command -v node)"

# --- Project-specific process env (optional slot) ---
# Exports needed by every agent session go here, mirrored into
# CLAUDE_ENV_FILE so later tool calls inherit them. Example:
#   export MY_VAR=1
#   my_line='export MY_VAR=1'
#   if [ -n "${CLAUDE_ENV_FILE:-}" ] && ! grep -qF "$my_line" "$CLAUDE_ENV_FILE" 2>/dev/null; then
#     echo "$my_line" >> "$CLAUDE_ENV_FILE"
#   fi

# --- Dependencies (corepack pins pnpm from package.json#packageManager) ---
# corepack enable is idempotent and ~50ms — run it before the fast path so a
# session never skips the install gate while pnpm itself is unresolvable.
corepack enable >/dev/null 2>&1 || true
for tool in corepack pnpm pnpx; do
  tool_path="$(command -v "$tool" 2>/dev/null || true)"
  if [ -n "$tool_path" ]; then
    ln -sf "$(realpath "$tool_path")" "$local_bin/$tool" || true
  fi
done

# SessionStart also fires on resume/clear/compact; skip the install when the
# lockfile hasn't changed since the last successful one in this container.
stamp_file="node_modules/.cloud-setup-stamp"
lock_hash="$(sha256sum pnpm-lock.yaml 2>/dev/null | cut -d' ' -f1 || true)"
if [ -n "$lock_hash" ] && [ "$lock_hash" = "$(cat "$stamp_file" 2>/dev/null || true)" ]; then
  echo "Dependencies already installed for this lockfile — skipping pnpm install."
  exit 0
fi
corepack pnpm install --frozen-lockfile
echo "$lock_hash" > "$stamp_file" || true
