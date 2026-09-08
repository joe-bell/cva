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
mkdir -p "$consumer_dir/node_modules/cva" "$consumer_dir/node_modules"
tar -xzf "$tarball" -C "$consumer_dir/node_modules/cva" --strip-components=1
ln -s "$package_dir/node_modules/clsx" "$consumer_dir/node_modules/clsx"
cp "$fixture_dir"/{esm.mts,cjs.cts,downstream.mts,downstream.cts} "$consumer_dir"

pnpm exec tsc "$consumer_dir/esm.mts" --ignoreConfig --strict --declaration --module nodenext --moduleResolution nodenext --typeRoots "$package_dir/node_modules/@types" --types node --outDir "$consumer_dir/out/esm"
pnpm exec tsc "$consumer_dir/cjs.cts" --ignoreConfig --strict --declaration --module nodenext --moduleResolution nodenext --typeRoots "$package_dir/node_modules/@types" --types node --outDir "$consumer_dir/out/cjs"
node "$consumer_dir/out/esm/esm.mjs"
node "$consumer_dir/out/cjs/cjs.cjs"
pnpm exec tsc "$consumer_dir/downstream.mts" --ignoreConfig --strict --noEmit --module nodenext --moduleResolution nodenext
pnpm exec tsc "$consumer_dir/downstream.cts" --ignoreConfig --strict --noEmit --module nodenext --moduleResolution nodenext
