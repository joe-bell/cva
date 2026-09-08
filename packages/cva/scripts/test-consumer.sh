#!/usr/bin/env bash

set -euo pipefail

package_dir=$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
fixture_dir="$package_dir/test/consumer"
if [[ ! -f "$package_dir/dist/index.mjs" ]]; then
  echo "cva dist is missing; run pnpm --filter cva build first." >&2
  exit 1
fi
temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/cva-consumer.XXXXXX")
trap 'rm -rf -- "$temp_dir"' EXIT

pnpm --dir "$package_dir" pack --pack-destination "$temp_dir"
tarball=$(find "$temp_dir" -maxdepth 1 -type f -name 'cva-*.tgz' -print -quit)
test -n "$tarball"

consumer_dir="$temp_dir/consumer"
installed_dir="$consumer_dir/node_modules/.pnpm/cva/node_modules"
mkdir -p "$installed_dir/cva"
tar -xzf "$tarball" -C "$installed_dir/cva" --strip-components=1
# clsx is resolvable only beside the installed cva, never from the consumer
# root, so a declaration that names clsx's types fails as it would under pnpm.
ln -s "$package_dir/node_modules/clsx" "$installed_dir/clsx"
ln -s .pnpm/cva/node_modules/cva "$consumer_dir/node_modules/cva"
cp "$fixture_dir"/{esm.mts,cjs.cts,downstream.mts,downstream.cts} "$consumer_dir"

pnpm exec tsc "$consumer_dir/esm.mts" "$consumer_dir/cjs.cts" --ignoreConfig --strict --declaration --module nodenext --moduleResolution nodenext --typeRoots "$package_dir/node_modules/@types" --types node --outDir "$consumer_dir/out"
node "$consumer_dir/out/esm.mjs"
node "$consumer_dir/out/cjs.cjs"
pnpm exec tsc "$consumer_dir/downstream.mts" "$consumer_dir/downstream.cts" --ignoreConfig --strict --noEmit --module nodenext --moduleResolution nodenext
