/**
 * Shared harness for the per-package `test/bench/scripts/*.bench.ts` files.
 *
 * Both the "local" implementation and every installed baseline are loaded
 * from built `dist/index.mjs` output — never from `src` — so the local
 * column measures what would actually ship, rather than vitest/esbuild's
 * on-the-fly transform of `src`. One caveat remains: a baseline's dist was
 * built by whatever toolchain its release used (SWC before the tsdown
 * migration, with a different down-leveling target), so a delta that spans
 * a toolchain or target change partly measures the toolchain, not the
 * source — treat it as indicative, not exact.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { ManifestEntry } from "./baselines";

export interface Implementation<Mod> {
  label: string;
  version: string;
  mod: Mod;
}

/**
 * Shared tinybench options for every `bench()` call. tinybench defaults to
 * a 500ms measure and 100ms warmup — tuned for fast local iteration;
 * doubling both meaningfully tightens the relative margin of error on
 * noisy shared CI runners, which is what the comparison table's ±5% noise
 * band hinges on.
 */
export const BENCH_OPTIONS = { time: 1000, warmupTime: 200 };

async function importDist<Mod>(distPath: string): Promise<Mod> {
  return await import(pathToFileURL(distPath).href);
}

/**
 * Loads the local built implementation plus any installed baselines for
 * `pkg`, using the `BENCH_BASELINES_DIR` manifest written by
 * test/bench/scripts/baselines.ts. `packageDir` is the absolute path to the package
 * directory (e.g. `packages/cva`).
 *
 * The local build is required — if `dist/index.mjs` is missing or stale,
 * that's a real problem (run `pnpm build`), so it throws rather than
 * silently omitting the local column. A baseline that fails to import, or
 * that imports but fails the caller's `isUsable` probe (API drift in an
 * older published version — e.g. a renamed or missing export that would
 * otherwise throw at benchmark-registration time and take the whole bench
 * file down with it), is skipped instead: report.ts renders that as a note
 * in the comparison table rather than failing the whole benchmark run.
 */
export async function loadImplementations<Mod>(
  pkg: string,
  packageDir: string,
  isUsable?: (mod: Mod) => boolean,
): Promise<Implementation<Mod>[]> {
  const localPkgJson = JSON.parse(
    readFileSync(path.join(packageDir, "package.json"), "utf8"),
  );

  let localMod: Mod;
  try {
    localMod = await importDist<Mod>(path.join(packageDir, "dist/index.mjs"));
  } catch (error) {
    throw new Error(
      `failed to import the local build of "${pkg}" at ${path.join(packageDir, "dist/index.mjs")} — run \`pnpm build\` first: ${(error as Error).message}`,
    );
  }

  const implementations: Implementation<Mod>[] = [
    { label: "local", version: localPkgJson.version, mod: localMod },
  ];

  const baselinesDir = process.env.BENCH_BASELINES_DIR;
  if (!baselinesDir) return implementations;

  let manifest: { entries: ManifestEntry[] };
  try {
    manifest = JSON.parse(
      readFileSync(path.join(baselinesDir, "manifest.json"), "utf8"),
    );
  } catch {
    return implementations;
  }

  for (const entry of manifest.entries) {
    if (entry.package !== pkg || entry.skipped || !entry.dir) continue;

    try {
      const mod = await importDist<Mod>(
        path.join(
          baselinesDir,
          entry.dir,
          "node_modules",
          pkg,
          "dist/index.mjs",
        ),
      );
      if (isUsable && !isUsable(mod)) continue;
      implementations.push({ label: entry.label, version: entry.version, mod });
    } catch {
      // API drift or an unexpected dist layout in an older published
      // version — skip it. test/bench/scripts/report.ts renders a note for any
      // manifest entry that never produced a benchmark group.
    }
  }

  return implementations;
}
