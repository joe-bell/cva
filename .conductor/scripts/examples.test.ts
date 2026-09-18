import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, vi } from "vitest";
import {
  createDevCommand,
  discoverExamples,
  getExamplePort,
  run,
  restoreTerminal,
} from "./examples.ts";

async function withFixture(callback: (rootPath: string) => Promise<void>) {
  const rootPath = await mkdtemp(join(tmpdir(), "cva-conductor-examples-"));
  try {
    for (const [version, name] of [
      ["latest", "vue-example"],
      ["beta", "astro-example"],
    ]) {
      const packagePath = join(rootPath, "examples", version, name);
      await mkdir(packagePath, { recursive: true });
      await writeFile(
        join(packagePath, "package.json"),
        JSON.stringify({ scripts: { dev: "vite" } }),
      );
    }
    const ignoredPath = join(rootPath, "examples", "latest", "ignored");
    await mkdir(ignoredPath, { recursive: true });
    await writeFile(join(ignoredPath, "package.json"), "{}");
    return await callback(rootPath);
  } finally {
    await rm(rootPath, { recursive: true, force: true });
  }
}

test("discovers sorted, labelled dev examples", async () => {
  await withFixture(async (rootPath) => {
    const examples = await discoverExamples(rootPath);
    assert.deepEqual(
      examples.map(({ label, path }) => [label, path]),
      [
        ["beta: astro-example", "./examples/beta/astro-example"],
        ["latest: vue-example", "./examples/latest/vue-example"],
      ],
    );
  });
});

test("uses distinct local and cloud ports and safe argv", () => {
  assert.equal(
    getExamplePort({ CONDUCTOR_IS_LOCAL: "1", CONDUCTOR_PORT: "5000" }),
    5001,
  );
  assert.equal(getExamplePort({ CONDUCTOR_IS_LOCAL: "0" }), 4322);
  assert.deepEqual(
    createDevCommand(
      { path: "./examples/beta/vue" },
      { CONDUCTOR_IS_LOCAL: "0" },
      "/repo",
    ),
    [
      "pnpm",
      "--dir",
      "/repo",
      "--filter",
      "./examples/beta/vue",
      "dev",
      "--host",
      "0.0.0.0",
      "--port",
      "4322",
    ],
  );
});

test("cancelling leaves the server unstarted", async () => {
  await withFixture(async (rootPath) => {
    let execCalls = 0;
    const code = await run({
      rootPath,
      terminal: { isTTY: true },
      prompt: async () => "cancelled",
      isCancelled: (value) => value === "cancelled",
      execve: () => {
        execCalls += 1;
      },
    });
    assert.equal(code, 130);
    assert.equal(execCalls, 0);
  });
});

test("restores terminal state before replacing itself with the server", async () => {
  await withFixture(async (rootPath) => {
    const events: unknown[][] = [];
    const terminal = {
      isTTY: true,
      setRawMode(value: boolean) {
        events.push(["rawMode", value]);
      },
      resume() {
        events.push(["resume"]);
      },
    };
    const code = await run({
      rootPath,
      env: { CONDUCTOR_IS_LOCAL: "1", CONDUCTOR_PORT: "5000" },
      terminal,
      prompt: async ({ options }) => options[0].value,
      execve: (...args) => events.push(["execve", ...args]),
    });

    assert.equal(code, 0);
    assert.deepEqual(events, [
      ["rawMode", false],
      [
        "execve",
        "/bin/sh",
        [
          "sh",
          "-c",
          'exec pnpm "$@"',
          "pnpm",
          "--dir",
          rootPath,
          "--filter",
          "./examples/beta/astro-example",
          "dev",
          "--port",
          "5001",
        ],
        { CONDUCTOR_IS_LOCAL: "1", CONDUCTOR_PORT: "5000" },
      ],
    ]);
  });
});

test("skips missing version folders, manifests and non-directory entries", async () => {
  await withFixture(async (rootPath) => {
    await rm(join(rootPath, "examples/latest"), { recursive: true });
    await mkdir(join(rootPath, "examples/beta/no-manifest"));
    await writeFile(join(rootPath, "examples/beta/README.md"), "examples");
    assert.equal((await discoverExamples(rootPath)).length, 1);
  });
});

test("reports unreadable folders and malformed manifests", async () => {
  await withFixture(async (rootPath) => {
    await writeFile(
      join(rootPath, "examples/beta/astro-example/package.json"),
      "{",
    );
    await assert.rejects(discoverExamples(rootPath), SyntaxError);
    await rm(join(rootPath, "examples/beta"), { recursive: true });
    await writeFile(join(rootPath, "examples/beta"), "not a directory");
    await assert.rejects(discoverExamples(rootPath), { code: "ENOTDIR" });
  });
});

test("rejects missing, malformed and out-of-range local ports", () => {
  for (const port of [undefined, "", " 5000 ", "0x1388", "1.5", "0", "65535"]) {
    assert.throws(
      () => getExamplePort({ CONDUCTOR_PORT: port }),
      /allocated TCP port/,
    );
  }
});

test("does not launch without examples or an interactive terminal", async () => {
  await withFixture(async (rootPath) => {
    assert.equal(await run({ rootPath, terminal: { isTTY: false } }), 1);
    await rm(join(rootPath, "examples"), { recursive: true });
    assert.equal(await run({ rootPath }), 1);
  });
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    assert.equal(await run(), 1);
    assert.deepEqual(error.mock.calls, [
      ["Examples selection requires a TTY."],
    ]);
  } finally {
    error.mockRestore();
  }
});

test("rejects invalid selection and unsupported Node before launching", async () => {
  await withFixture(async (rootPath) => {
    const options = { rootPath, terminal: { isTTY: true } };
    assert.equal(await run({ ...options, prompt: async () => "missing" }), 1);
    await assert.rejects(
      run({
        ...options,
        prompt: async ({ options }) => options[0].value,
        execve: null,
      }),
      /Node 24/,
    );
  });
});

test("CLI locates examples outside the repo cwd and exits without a terminal", () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./examples.ts", import.meta.url))],
    { cwd: tmpdir(), encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Examples selection requires a TTY/);
});

test("terminal restoration tolerates non-TTY input", () => {
  assert.doesNotThrow(() => restoreTerminal({ isTTY: false }));
});

test("ignores manifests without an object containing a string dev script", async () => {
  await withFixture(async (rootPath) => {
    for (const manifest of [
      null,
      1,
      [],
      { scripts: null },
      { scripts: 1 },
      { scripts: {} },
      { scripts: { dev: 1 } },
    ]) {
      await writeFile(
        join(rootPath, "examples/beta/astro-example/package.json"),
        JSON.stringify(manifest),
      );
      assert.equal((await discoverExamples(rootPath)).length, 1);
    }
  });
});

test("CLI follows symlinked paths without module-type warnings", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cva-picker-symlink-"));
  try {
    const launcher = join(directory, "examples.ts");
    await symlink(
      fileURLToPath(new URL("./examples.ts", import.meta.url)),
      launcher,
    );
    const result = spawnSync(process.execPath, [launcher], {
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), "Examples selection requires a TTY.");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
