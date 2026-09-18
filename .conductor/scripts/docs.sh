#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

if [ "${CONDUCTOR_IS_LOCAL:-1}" = "0" ]; then
  exec pnpm --filter ./docs dev --host 0.0.0.0 --port 4321
fi

if [ -z "${CONDUCTOR_PORT:-}" ]; then
  printf '%s\n' 'CONDUCTOR_PORT is required in a local workspace.' >&2
  exit 1
fi

exec pnpm --filter ./docs dev --port "$CONDUCTOR_PORT"
