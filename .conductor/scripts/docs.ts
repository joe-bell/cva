#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { getLocalPort } from "./ports.ts";
import { fileURLToPath } from "node:url";

export function createDocsCommand(env: NodeJS.ProcessEnv): string[] {
  const command = ["--filter", "./docs", "dev"];
  if (env.CONDUCTOR_IS_LOCAL === "0") {
    return [...command, "--host", "0.0.0.0", "--port", "4321"];
  }
  if (!env.CONDUCTOR_PORT) {
    throw new Error("CONDUCTOR_PORT is required in a local workspace.");
  }
  return [...command, "--port", String(getLocalPort(env.CONDUCTOR_PORT))];
}

/* v8 ignore start -- process entrypoint; subprocess tests exercise this
   block, but subprocess coverage is not collected. */
if (
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (!process.execve) {
      throw new Error("Node 24 or newer is required to run the docs");
    }
    process.execve(
      "/bin/sh",
      [
        "sh",
        "-c",
        'exec pnpm "$@"',
        "pnpm",
        "--dir",
        fileURLToPath(new URL("../../", import.meta.url)),
        ...createDocsCommand(process.env),
      ],
      process.env,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
/* v8 ignore stop */
