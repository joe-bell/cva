import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { createDocsCommand } from "./docs.ts";

test("Docs uses the allocated local port or the cloud host and port", () => {
  assert.deepEqual(createDocsCommand({ CONDUCTOR_PORT: "5000" }), [
    "--filter",
    "./docs",
    "dev",
    "--port",
    "5000",
  ]);
  assert.deepEqual(createDocsCommand({ CONDUCTOR_IS_LOCAL: "0" }), [
    "--filter",
    "./docs",
    "dev",
    "--host",
    "0.0.0.0",
    "--port",
    "4321",
  ]);
  assert.throws(() => createDocsCommand({}), /CONDUCTOR_PORT is required/);
});

test("Docs CLI launches pnpm with the repository directory and preserves exit status", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cva-docs-launcher-"));
  try {
    await writeFile(
      join(directory, "pnpm"),
      '#!/bin/sh\nprintf "%s\\n" "$@"\nexit 7\n',
      { mode: 0o755 },
    );
    const launcher = join(directory, "docs.ts");
    await symlink(
      fileURLToPath(new URL("./docs.ts", import.meta.url)),
      launcher,
    );
    const result = spawnSync(process.execPath, [launcher], {
      cwd: tmpdir(),
      env: {
        ...process.env,
        CONDUCTOR_IS_LOCAL: "0",
        PATH: `${directory}:${process.env.PATH}`,
      },
      encoding: "utf8",
    });
    assert.equal(result.status, 7);
    assert.equal(result.stderr, "");
    assert.deepEqual(result.stdout.trim().split("\n"), [
      "--dir",
      fileURLToPath(new URL("../../", import.meta.url)),
      ...createDocsCommand({ CONDUCTOR_IS_LOCAL: "0" }),
    ]);
    const failure = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./docs.ts", import.meta.url))],
      {
        env: { ...process.env, CONDUCTOR_IS_LOCAL: "1", CONDUCTOR_PORT: "" },
        encoding: "utf8",
      },
    );
    assert.equal(failure.status, 1);
    assert.match(failure.stderr, /CONDUCTOR_PORT is required/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Docs rejects malformed local ports", () => {
  for (const port of ["abc", "0", "65535", "0x1388", " 5000 "]) {
    assert.throws(
      () => createDocsCommand({ CONDUCTOR_PORT: port }),
      /allocated TCP port/,
    );
  }
});
