// Guards against TS4023/TS4025 ("has or is using name '...' but cannot be
// named") in downstream `declaration: true` builds, by compiling fixture.ts
// against the PACKED tarball. `pnpm pack` (not `npm pack`) is required: only
// pnpm applies the `publishConfig` exports/main/types rewrite to dist/, which
// is what actually ships. Like `check:exports` (attw --pack), this validates
// the built dist/ output, not src/ — the package `check` script runs
// `pnpm build` first, so a direct `node check.mjs` invocation is the only
// case that can see a stale dist/.
import { execFile, execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// pnpm resolves to a `.cmd` shim on Windows, which Node's execFile refuses to
// spawn without a shell — `tar` doesn't need this (Windows 10+ ships bsdtar).
const shell = process.platform === "win32";

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, "../..");

if (!existsSync(join(packageDir, "dist/index.d.ts"))) {
  console.error(
    "packages/cva/dist/index.d.ts is missing — run `pnpm build` first.",
  );
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "cva-declaration-emission-"));

try {
  execFileSync("pnpm", ["pack", "--pack-destination", tmp], {
    cwd: packageDir,
    stdio: "inherit",
    shell,
  });

  const tarball = readdirSync(tmp).find((file) => file.endsWith(".tgz"));
  if (!tarball) {
    // Thrown (not `process.exit`) so the `finally` below still runs and
    // cleans up `tmp`.
    throw new Error(`No tarball produced by \`pnpm pack\` in ${tmp}`);
  }

  const project = join(tmp, "project");
  const installed = join(project, "node_modules", "cva");
  mkdirSync(installed, { recursive: true });
  execFileSync(
    "tar",
    ["-xzf", join(tmp, tarball), "--strip-components=1", "-C", installed],
    { stdio: "inherit" },
  );

  cpSync(join(here, "fixture.ts"), join(project, "fixture.ts"));
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({
      name: "cva-declaration-emission-fixture",
      private: true,
      type: "module",
    }),
  );
  writeFileSync(
    join(project, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: "es2022",
        skipLibCheck: true,
        types: [],
        declaration: true,
        emitDeclarationOnly: true,
        outDir: "./out",
      },
      include: ["fixture.ts"],
    }),
  );

  const tsconfigPath = join(project, "tsconfig.json");
  // Two module/resolution combos: `nodenext` mirrors a strict published-
  // package consumer (exercises the rewritten `exports` map), `bundler`
  // mirrors this repo's own base tsconfig and the common downstream setup.
  // Independent of each other, so run them concurrently rather than serially.
  const combos = [
    { module: "nodenext", moduleResolution: "nodenext" },
    { module: "preserve", moduleResolution: "bundler" },
  ];

  const results = await Promise.allSettled(
    combos.map((combo) =>
      execFileAsync(
        "pnpm",
        [
          "exec",
          "tsc",
          "--project",
          tsconfigPath,
          "--module",
          combo.module,
          "--moduleResolution",
          combo.moduleResolution,
        ],
        { cwd: packageDir, shell },
      ),
    ),
  );

  const failures = results
    .map((result, i) => ({ result, combo: combos[i] }))
    .filter(({ result }) => result.status === "rejected");

  if (failures.length > 0) {
    for (const { result, combo } of failures) {
      console.error(
        `\n--- tsc failed (--module ${combo.module} --moduleResolution ${combo.moduleResolution}) ---`,
      );
      const { stdout, stderr } = result.reason;
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
    }
    process.exitCode = 1;
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
