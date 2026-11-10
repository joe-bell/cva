#!/bin/bash
# .agents/setup.sh: provision this repo's toolchain and dependencies in a
# fresh Linux container. Agent-neutral: any agent or person can run it.
# Shared verbatim between repos: keep it identical and put repo-specific
# extras in .agents/setup.local.sh, which this sources if present.
#
# Reads only what the repo declares:
#   .node-version  -> Node: a major (`24`) or an exact version (`22.22.2`)
#   packageManager + pnpm-lock.yaml -> Corepack pnpm; package-lock.json -> npm
#
# Node goes to ~/.local/share/node/v<.node-version>, the first place each
# repo's scripts/setup-node.sh looks, so pre-commit hooks find it.
set -euo pipefail

# The repo is wherever this file lives, never an inherited CLAUDE_PROJECT_DIR.
cd "$(dirname "${BASH_SOURCE[0]}")/.."
repo="$(basename "$PWD")"
fail() { echo "setup ($repo): $*" >&2; exit 1; }
[ "$(uname -s)" = Linux ] || fail "for Linux containers; on a Mac use fnm"

spec="$(tr -d '[:space:]' <.node-version 2>/dev/null || true)"
spec="${spec#v}"
[[ "$spec" =~ ^[0-9]+(\.[0-9]+\.[0-9]+)?$ ]] || fail ".node-version is missing or not a major/exact version: '${spec}'"
node_dir="$HOME/.local/share/node/v${spec}"

# Usable means it runs AND matches the pin (exact, or same major).
usable() {
  local v
  v="$("$1/bin/node" -v 2>/dev/null)" || return 1
  v="${v#v}"
  case "$spec" in
    *.*.*) [ "$v" = "$spec" ] ;;
    *) [ "${v%%.*}" = "$spec" ] ;;
  esac
}

# One download per Node version even when several repos set up at once.
mkdir -p "$(dirname "$node_dir")"
exec 9>"${node_dir}.lock"
flock 9
if ! usable "$node_dir"; then
  case "$(uname -m)" in
    x86_64) arch=x64 ;;
    aarch64 | arm64) arch=arm64 ;;
    *) fail "unsupported arch $(uname -m)" ;;
  esac
  case "$spec" in
    *.*.*) dist="v${spec}" ;;
    *) dist="latest-v${spec}.x" ;;
  esac
  fetch() { curl -fsSL --proto '=https' --tlsv1.2 --retry 3 --retry-connrefused "$@"; }
  shasums="$(fetch "https://nodejs.org/dist/${dist}/SHASUMS256.txt")"
  tarball="$(awk -v a="linux-${arch}.tar.gz" '$2 ~ ("^node-v[0-9.]+-" a "$") { print $2; exit }' <<<"$shasums")"
  expected="$(awk -v f="$tarball" '$2 == f { print $1 }' <<<"$shasums")"
  [ -n "$tarball" ] && [ -n "$expected" ] || fail "no Node ${spec} linux-${arch} tarball in ${dist}"
  # Private temp dir; publish with a rename so no run ever sees half a Node.
  tmp="$(mktemp -d "${node_dir}.partial.XXXXXX")"
  trap 'rm -rf "$tmp"' EXIT
  fetch -o "$tmp/$tarball" "https://nodejs.org/dist/${dist}/${tarball}"
  echo "${expected}  $tmp/$tarball" | sha256sum --check --quiet
  mkdir "$tmp/node"
  tar -xzf "$tmp/$tarball" -C "$tmp/node" --strip-components=1
  usable "$tmp/node" || fail "downloaded Node does not match pin ${spec}"
  rm -rf "$node_dir"
  mv "$tmp/node" "$node_dir"
  rm -rf "$tmp"
  trap - EXIT
fi
flock -u 9

export PATH="$node_dir/bin:$PATH"
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  line="export PATH=\"$node_dir/bin:\$PATH\""
  grep -qxF "$line" "$CLAUDE_ENV_FILE" 2>/dev/null || echo "$line" >>"$CLAUDE_ENV_FILE"
fi
echo "setup ($repo): node $(node -v)"

# shellcheck source=/dev/null
[ -f .agents/setup.local.sh ] && . .agents/setup.local.sh

[ -f package.json ] || exit 0
export CI=true COREPACK_ENABLE_DOWNLOAD_PROMPT=0
pm="$(node -p 'require("./package.json").packageManager || ""')"
if [ -f pnpm-lock.yaml ]; then
  [[ "$pm" == pnpm@* ]] || fail "pnpm-lock.yaml but packageManager is '${pm}'"
  # Shim next to this Node, so scripts and hooks that call `pnpm` get the pin.
  corepack enable pnpm
  want="${pm#pnpm@}" have="$(pnpm -v)"
  [ "$have" = "${want%%+*}" ] || fail "pnpm $have is not ${pm}"
  lock=pnpm-lock.yaml run=(pnpm) install=(pnpm install --frozen-lockfile)
elif [ -f package-lock.json ]; then
  lock=package-lock.json run=(npm) install=(npm ci)
else
  exit 0
fi

# Skip reinstalling when Node, lockfile and package.json are unchanged.
stamp_file=node_modules/.agents-setup-stamp
stamp="$(node -v) $(sha256sum "$lock" package.json | cut -d' ' -f1 | tr '\n' ' ')"
if [ "$stamp" != "$(cat "$stamp_file" 2>/dev/null || true)" ]; then
  "${install[@]}"
  mkdir -p node_modules && echo "$stamp" >"$stamp_file"
fi

# CI=true can skip a repo's prepare step, so wire git hooks explicitly and
# fail loudly rather than leave commits unchecked.
if [ -d .github/hooks ]; then
  if node -e 'process.exit(require("./package.json").scripts?.["prepare:hooks"] ? 0 : 1)'; then
    "${run[@]}" run prepare:hooks
  fi
  [ "$(git config core.hooksPath || true)" = ".github/hooks" ] || fail "core.hooksPath is not .github/hooks"
fi
echo "setup ($repo): ready"
