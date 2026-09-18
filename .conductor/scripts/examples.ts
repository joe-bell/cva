#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { getLocalPort } from "./ports.ts";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { isCancel, select, type SelectOptions } from "@clack/prompts";

const EXAMPLE_VERSIONS = ["beta", "latest"];
const CLOUD_PORT = 4322;

interface Example {
  label: string;
  path: string;
  version: string;
}

interface TerminalInput {
  isTTY?: boolean;
  setRawMode?: (mode: boolean) => unknown;
}

export async function discoverExamples(rootPath: string) {
  const examples: Example[] = [];

  for (const version of EXAMPLE_VERSIONS) {
    const versionPath = join(rootPath, "examples", version);
    let entries;
    try {
      entries = await readdir(versionPath, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const packagePath = join(versionPath, entry.name, "package.json");
      let packageJson: unknown;
      try {
        packageJson = JSON.parse(await readFile(packagePath, "utf8"));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }

      if (
        typeof packageJson !== "object" ||
        packageJson === null ||
        !("scripts" in packageJson) ||
        typeof packageJson.scripts !== "object" ||
        packageJson.scripts === null ||
        !("dev" in packageJson.scripts) ||
        typeof packageJson.scripts.dev !== "string"
      )
        continue;

      examples.push({
        label: `${version}: ${entry.name}`,
        path: `./examples/${version}/${entry.name}`,
        version,
      });
    }
  }

  return examples.sort((a, b) => a.label.localeCompare(b.label));
}

export function getExamplePort(env: NodeJS.ProcessEnv) {
  if (env.CONDUCTOR_IS_LOCAL === "0") return CLOUD_PORT;
  return getLocalPort(env.CONDUCTOR_PORT) + 1;
}

export function createDevCommand(
  example: { path: string },
  env: NodeJS.ProcessEnv,
  rootPath: string,
) {
  const command = ["pnpm", "--dir", rootPath, "--filter", example.path, "dev"];
  if (env.CONDUCTOR_IS_LOCAL === "0") command.push("--host", "0.0.0.0");
  command.push("--port", String(getExamplePort(env)));
  return command;
}

export function restoreTerminal(terminal: TerminalInput) {
  if (terminal.isTTY && typeof terminal.setRawMode === "function") {
    terminal.setRawMode(false);
  }
}

interface RunOptions {
  rootPath?: string;
  env?: NodeJS.ProcessEnv;
  terminal?: TerminalInput;
  prompt?: (options: SelectOptions<string>) => Promise<string | symbol>;
  isCancelled?: (value: unknown) => boolean;
  // Null models a runtime without execve in the compatibility test.
  execve?:
    | ((file: string, args: string[], env: NodeJS.ProcessEnv) => void)
    | null;
}

export async function run({
  rootPath = fileURLToPath(new URL("../../", import.meta.url)),
  env = process.env,
  terminal = process.stdin,
  prompt = select,
  isCancelled = isCancel,
  execve = process.execve,
}: RunOptions = {}) {
  const examples = await discoverExamples(rootPath);
  if (examples.length === 0) {
    console.error("No examples with a dev script were found.");
    return 1;
  }

  if (!terminal.isTTY) {
    console.error("Examples selection requires a TTY.");
    return 1;
  }

  const selected = await prompt({
    message: "Choose an example to run: ",
    options: examples.map((example) => ({
      label: example.label,
      value: example.path,
    })),
  });

  if (isCancelled(selected)) {
    restoreTerminal(terminal);
    return 130;
  }

  const example = examples.find(({ path }) => path === selected);
  if (!example) {
    restoreTerminal(terminal);
    console.error("The selected example is no longer available.");
    return 1;
  }

  if (typeof execve !== "function") {
    restoreTerminal(terminal);
    throw new Error("Node 24 or newer is required to run an example");
  }

  const command = createDevCommand(example, env, rootPath);
  restoreTerminal(terminal);
  // Replacing the selector keeps the dev server in Conductor's process group.
  execve(
    "/bin/sh",
    ["sh", "-c", 'exec pnpm "$@"', "pnpm", ...command.slice(1)],
    env,
  );
  return 0;
}

/* v8 ignore start -- process entrypoint; subprocess and PTY checks exercise
   this block, but subprocess coverage is not collected. */
const isMainModule =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  run()
    .then((code) => {
      if (code) process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}

/* v8 ignore stop */
