#!/bin/sh
# Link env files from the primary checkout into a linked worktree. Conductor
# exposes the primary path directly; plain git worktrees derive it from Git.
set -e

resolve_dir() {
  (CDPATH= cd -P "$1" && pwd)
}

if [ -n "${CONDUCTOR_ROOT_PATH:-}" ]; then
  PRIMARY=$CONDUCTOR_ROOT_PATH
  TARGET=${CONDUCTOR_WORKSPACE_PATH:-$(git rev-parse --show-toplevel 2>/dev/null || printf '%s\n' "$PWD")}
else
  git_dir=$(git rev-parse --git-dir)
  case $git_dir in
    */worktrees/*) ;;
    *) exit 0 ;;
  esac

  PRIMARY=$(dirname "$(resolve_dir "$(git rev-parse --git-common-dir)")")
  TARGET=$(git rev-parse --show-toplevel)
fi

if [ "$(resolve_dir "$PRIMARY")" = "$(resolve_dir "$TARGET")" ]; then
  exit 0
fi

linked=0

link_env() {
  src=$1
  rel=${src#"$PRIMARY"/}
  dest=$TARGET/$rel

  # Preserve worktree-local regular files; refresh existing symlinks.
  if [ -L "$dest" ]; then
    [ "$(readlink "$dest")" = "$src" ] && return 0
  elif [ -e "$dest" ]; then
    return 0
  fi

  mkdir -p "$(dirname "$dest")"
  ln -sfn "$src" "$dest"
  echo "linked $rel"
  linked=$((linked + 1))
}

for name in .env .env.local; do
  if [ -f "$PRIMARY/$name" ]; then
    link_env "$PRIMARY/$name"
  fi
done

workspace_entries=$(awk '
  /^packages:[[:space:]]*$/ { in_packages = 1; next }
  in_packages && /^[^[:space:]]/ { exit }
  in_packages && /^[[:space:]]*-[[:space:]]*/ {
    sub(/^[[:space:]]*-[[:space:]]*/, "")
    gsub(/["\047]/, "")
    print
  }
' "$PRIMARY/pnpm-workspace.yaml")

workspace_files=$(printf '%s\n' "$workspace_entries" | while IFS= read -r entry; do
  [ -n "$entry" ] || continue

  root=${entry%%[*?[]*}
  root=${root%/}
  [ -d "$PRIMARY/$root" ] || continue

  find "$PRIMARY/$root" -name node_modules -prune -o \( -name .env -o -name .env.local \) -type f -print
done)

if [ -n "$workspace_files" ]; then
  while IFS= read -r src; do
    link_env "$src"
  done <<EOF
$workspace_files
EOF
fi

if [ "$linked" -gt 0 ]; then
  echo "linked $linked env file(s)"
fi
