// Guards against TS4023/TS4025 ("has or is using name '...' but cannot be
// named") in downstream `declaration: true` builds, by compiling fixture.ts
// against the PACKED tarball. `pnpm pack` (not `npm pack`) is required: only
// pnpm applies the `publishConfig` exports/main/types rewrite to dist/, which
// is what actually ships. Like `check:exports` (attw --pack), this validates
// the built dist/ output, not src/ — run `pnpm build` first.
import { execFileSync } from "node:child_process";
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
  });

  const tarball = readdirSync(tmp).find((file) => file.endsWith(".tgz"));
  if (!tarball) {
    console.error(`No tarball produced by \`pnpm pack\` in ${tmp}`);
    process.exit(1);
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
  for (const flags of [
    ["--module", "nodenext", "--moduleResolution", "nodenext"],
    ["--module", "preserve", "--moduleResolution", "bundler"],
  ]) {
    execFileSync("pnpm", ["exec", "tsc", "--project", tsconfigPath, ...flags], {
      cwd: packageDir,
      stdio: "inherit",
    });
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
