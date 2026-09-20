import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it, vi } from "vitest";

import { main } from "./type-performance";

const packageDir = fileURLToPath(
  new URL("../../../packages/cva/", import.meta.url),
);

afterEach(() => vi.restoreAllMocks());

it("reports each consumer count with the compiler version and explicit flags", () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const exec = vi.fn(() => "Instantiations: 42\n");
  exec.mockReturnValueOnce("Version 6.0.3\n");

  main({ execImpl: exec });

  expect(log.mock.calls).toEqual([
    ["Version 6.0.3"],
    ["plain: 42"],
    ["composed: 42"],
    ["get-schema: 42"],
    ["direct-interface: 42"],
  ]);
  expect(exec).toHaveBeenCalledTimes(5);
  for (const fixture of [
    "plain",
    "composed",
    "get-schema",
    "direct-interface",
  ]) {
    expect(exec).toHaveBeenCalledWith(
      process.execPath,
      [
        path.join(packageDir, "node_modules/typescript/bin/tsc"),
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
      { cwd: packageDir, encoding: "utf8" },
    );
  }
});

it("stops on compiler failure even when its output contains a count", () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const failure = Object.assign(new Error("tsc exited 2"), {
    stdout: "error TS2322: invalid fixture\nInstantiations: 10\n",
  });
  const exec = vi.fn((): string => {
    throw failure;
  });
  exec.mockReturnValueOnce("Version 6.0.3\n");

  expect(() => main({ execImpl: exec })).toThrow(failure);
  expect(log.mock.calls).toEqual([["Version 6.0.3"]]);
  expect(exec).toHaveBeenCalledTimes(2);
});

it("rejects output without an instantiation count", () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const exec = vi.fn(() => "unexpected compiler output");
  exec.mockReturnValueOnce("Version 6.0.3\n");

  expect(() => main({ execImpl: exec })).toThrow(
    "plain: missing instantiation count\nunexpected compiler output",
  );
});
