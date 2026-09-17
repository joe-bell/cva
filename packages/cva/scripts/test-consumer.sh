#!/usr/bin/env bash

set -euo pipefail

package_dir=$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
fixture_dir="$package_dir/test/consumer"
if [[ ! -f "$package_dir/dist/index.mjs" ]]; then
  echo "cva dist is missing; run pnpm --filter cva build first." >&2
  exit 1
fi
if find "$package_dir/dist" -maxdepth 1 \( -name 'utils' -o -name 'utils.*' \) -print -quit | grep -q .; then
  echo "cva dist contains a utils artifact." >&2
  exit 1
fi
tsc_bin="$package_dir/node_modules/.bin/tsc"
if [[ ! -x "$tsc_bin" ]]; then
  echo "TypeScript is missing from cva's installed dependencies." >&2
  exit 1
fi
temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/cva-consumer.XXXXXX")
trap 'rm -rf -- "$temp_dir"' EXIT
physical_temp_dir=$(cd -P -- "$temp_dir" && pwd)
temp_dir=$physical_temp_dir

pnpm --dir "$package_dir" pack --pack-destination "$temp_dir"
tarball=$(find "$temp_dir" -maxdepth 1 -type f -name 'cva-*.tgz' -print -quit)
if [[ -z "$tarball" ]]; then
  echo "pnpm pack did not create a cva tarball." >&2
  exit 1
fi
if tar -tzf "$tarball" | grep -Eq '^package/dist/utils(\.|/|$)'; then
  echo "Packed cva tarball contains a utils artifact." >&2
  exit 1
fi

consumer_dir="$temp_dir/consumer"
installed_dir="$consumer_dir/node_modules/.pnpm/cva/node_modules"
mkdir -p "$installed_dir/cva"
tar -xzf "$tarball" -C "$installed_dir/cva" --strip-components=1
# clsx is resolvable only beside the installed cva, never from the consumer
# root, so a declaration that names clsx's types fails as it would under pnpm.
ln -s "$package_dir/node_modules/clsx" "$installed_dir/clsx"
ln -s .pnpm/cva/node_modules/cva "$consumer_dir/node_modules/cva"
cp "$fixture_dir"/{esm.mts,cjs.cts,downstream.mts,downstream.cts} "$consumer_dir"

cd "$consumer_dir"

if [[ "$(node -p 'require.resolve("cva/package.json")')" != "$installed_dir/cva/package.json" ]]; then
  echo "The consumer did not resolve cva from the extracted tarball." >&2
  exit 1
fi

if [[ "$(node -p 'require.resolve("cva/tailwindcss")')" != "$installed_dir/cva/dist/tailwindcss.css" ]]; then
  echo "The consumer did not resolve cva/tailwindcss from the packed dist/ stylesheet." >&2
  exit 1
fi

"$tsc_bin" esm.mts cjs.cts --ignoreConfig --strict --declaration --module nodenext --moduleResolution nodenext --typeRoots "$package_dir/node_modules/@types" --types node --outDir out
node out/esm.mjs
node out/cjs.cjs
"$tsc_bin" downstream.mts downstream.cts --ignoreConfig --strict --noEmit --module nodenext --moduleResolution nodenext

node --input-type=module --eval '
try {
  await import("cva/utils");
} catch (error) {
  if (error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") process.exit(0);
  console.error(`Expected ERR_PACKAGE_PATH_NOT_EXPORTED, received ${error?.code ?? error}`);
  process.exit(1);
}
console.error("Expected import(\"cva/utils\") to fail.");
process.exit(1);
'

node --eval '
try {
  require("cva/utils");
} catch (error) {
  if (error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") process.exit(0);
  console.error(`Expected ERR_PACKAGE_PATH_NOT_EXPORTED, received ${error?.code ?? error}`);
  process.exit(1);
}
console.error("Expected require(\"cva/utils\") to fail.");
process.exit(1);
'
