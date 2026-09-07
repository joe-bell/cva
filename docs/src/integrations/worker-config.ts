import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { parse, printParseErrorCode } from "jsonc-parser";

async function prepareWorkerConfig(dir: URL, sourceConfigUrl: URL) {
  const generatedConfigUrl = new URL("./wrangler.json", dir);
  const errors: Parameters<typeof parse>[1] = [];
  const source = parse(await readFile(sourceConfigUrl, "utf-8"), errors, {
    allowTrailingComma: true,
  });
  if (errors.length > 0) {
    throw new Error(
      `Could not parse wrangler.jsonc: ${errors
        .map((error) => printParseErrorCode(error.error))
        .join(", ")}`,
    );
  }
  const generated = JSON.parse(await readFile(generatedConfigUrl, "utf-8"));
  const sourceConfigPath = fileURLToPath(sourceConfigUrl);
  const generatedConfigPath = fileURLToPath(generatedConfigUrl);

  if (
    generated.userConfigPath !== sourceConfigPath ||
    generated.assets?.directory !== "." ||
    "no_bundle" in generated ||
    !source.main ||
    !source.assets?.binding ||
    JSON.stringify(generated.assets.run_worker_first) !==
      JSON.stringify(source.assets.run_worker_first) ||
    (source.kv_namespaces?.length ?? 0) > 0 ||
    (generated.kv_namespaces?.length ?? 0) > 0
  ) {
    throw new Error(
      "Astro generated an unexpected Wrangler deployment config.",
    );
  }

  const sourceAssetsDirectory = resolve(
    dirname(sourceConfigPath),
    source.assets.directory,
  );
  if (sourceAssetsDirectory !== resolve(fileURLToPath(dir))) {
    throw new Error(
      `The source Wrangler assets directory (${sourceAssetsDirectory}) must match Astro's client output (${resolve(fileURLToPath(dir))}).`,
    );
  }

  generated.main = relative(
    dirname(generatedConfigPath),
    fileURLToPath(new URL(source.main, sourceConfigUrl)),
  ).replaceAll("\\", "/");
  generated.assets.binding = source.assets.binding;
  await writeFile(
    generatedConfigUrl,
    `${JSON.stringify(generated, null, 2)}\n`,
  );
}

/** Restore the Worker fields stripped from Astro's static deployment config. */
export function workerConfig(): AstroIntegration {
  let sourceConfigUrl: URL;

  return {
    name: "worker-config",
    hooks: {
      "astro:config:setup": ({ config }) => {
        sourceConfigUrl = new URL("./wrangler.jsonc", config.root);
      },
      "astro:build:done": async ({ dir }) => {
        await prepareWorkerConfig(dir, sourceConfigUrl);
      },
    },
  };
}
