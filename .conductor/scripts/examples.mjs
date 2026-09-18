#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { isCancel, select } from "@clack/prompts";

const EXAMPLE_VERSIONS = ["beta", "latest"];
const CLOUD_PORT = 4322;

export async function discoverExamples(rootPath, fs = { readdir, readFile }) {
  const examples = [];

  for (const version of EXAMPLE_VERSIONS) {
    const versionPath = join(rootPath, "examples", version);
    let entries;
    try {
      entries = await fs.readdir(versionPath, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const packagePath = join(versionPath, entry.name, "package.json");
      let packageJson;
      try {
        packageJson = JSON.parse(await fs.readFile(packagePath, "utf8"));
      } catch (error) {
        if (error.code === "ENOENT") continue;
        throw error;
      }

      if (typeof packageJson.scripts?.dev !== "string") continue;

      examples.push({
        label: `${version}: ${entry.name}`,
        path: `./examples/${version}/${entry.name}`,
        version,
      });
    }
  }

  return examples.sort((a, b) => a.label.localeCompare(b.label));
}

function parsePort(value, name) {
  const port = Number(value);
  if (
    !/^\d+$/.test(value) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65534
  ) {
    throw new Error(`${name} must be an allocated TCP port`);
  }
  return port;
}

export function getExamplePort(env) {
  if (env.CONDUCTOR_IS_LOCAL === "0") return CLOUD_PORT;
  return parsePort(env.CONDUCTOR_PORT, "CONDUCTOR_PORT") + 1;
}

export function createDevCommand(example, env, rootPath) {
  const command = ["pnpm", "--dir", rootPath, "--filter", example.path, "dev"];
  if (env.CONDUCTOR_IS_LOCAL === "0") command.push("--host", "0.0.0.0");
  command.push("--port", String(getExamplePort(env)));
  return command;
}

export function restoreTerminal(input) {
  if (input.isTTY && typeof input.setRawMode === "function") {
    input.setRawMode(false);
  }
}

export async function run({
  rootPath = fileURLToPath(new URL("../../", import.meta.url)),
  env = process.env,
  input = process.stdin,
  output = process.stdout,
  prompt = select,
  isCancelled = isCancel,
  execve = process.execve,
} = {}) {
  const examples = await discoverExamples(rootPath);
  if (examples.length === 0) {
    console.error("No examples with a dev script were found.");
    return 1;
  }

  if (!input.isTTY) {
    console.error("Examples selection requires a TTY.");
    return 1;
  }

  const selected = await prompt({
    message: "Choose an example to run",
    options: examples.map((example) => ({
      label: example.label,
      hint: example.path,
      value: example.path,
    })),
    input,
    output,
  });

  if (isCancelled(selected)) {
    restoreTerminal(input);
    return 130;
  }

  const example = examples.find(({ path }) => path === selected);
  if (!example) {
    restoreTerminal(input);
    console.error("The selected example is no longer available.");
    return 1;
  }

  if (typeof execve !== "function") {
    restoreTerminal(input);
    throw new Error("Node 24 or newer is required to run an example");
  }

  const command = createDevCommand(example, env, rootPath);
  restoreTerminal(input);
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
const isMainModule = process.argv[1]
  ? resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
  : false;

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
