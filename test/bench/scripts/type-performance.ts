import {
  execFileSync,
  type ExecFileSyncOptionsWithStringEncoding,
} from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = fileURLToPath(
  new URL("../../../packages/cva/", import.meta.url),
);
const tsc = path.join(packageDir, "node_modules/typescript/bin/tsc");
const fixtures = ["plain", "composed", "get-schema", "direct-interface"];

type Exec = (
  file: string,
  args: string[],
  options: ExecFileSyncOptionsWithStringEncoding,
) => string;

export function main({ execImpl = execFileSync }: { execImpl?: Exec } = {}) {
  const options = { cwd: packageDir, encoding: "utf8" } as const;
  console.log(execImpl(process.execPath, [tsc, "--version"], options).trim());

  for (const fixture of fixtures) {
    const output = execImpl(
      process.execPath,
      [
        tsc,
        `test/type-performance/${fixture}.mts`,
        "--ignoreConfig",
        "--noEmit",
        "--skipLibCheck",
        "--strict",
        "--target",
        "es2019",
        "--lib",
        "es2019",
        "--module",
        "nodenext",
        "--moduleResolution",
        "nodenext",
        "--typeRoots",
        path.join(packageDir, "node_modules/@types"),
        "--types",
        "node",
        "--extendedDiagnostics",
        "--pretty",
        "false",
      ],
      options,
    );
    const count = output.match(/^Instantiations:\s*(\d+)\s*$/m);
    if (!count)
      throw new Error(`${fixture}: missing instantiation count\n${output}`);
    console.log(`${fixture}: ${count[1]}`);
  }
}

/* v8 ignore start -- CLI entrypoint; exercised by pnpm bench:types. */
function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) main();
/* v8 ignore stop */
