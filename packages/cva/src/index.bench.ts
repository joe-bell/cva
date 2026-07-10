import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { bench, describe } from "vitest";

import * as local from "./index";

/* Fixture
  ============================================ */

const buttonConfig = {
  base: "button font-semibold border rounded",
  variants: {
    intent: {
      primary:
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600",
      secondary:
        "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
      warning:
        "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600",
      danger: [
        "button--danger",
        ["bg-red-500", { baz: false, bat: null }, ["text-white"]],
        "hover:bg-red-600",
      ],
    },
    disabled: {
      true: "button--disabled opacity-50 cursor-not-allowed",
      false: "button--enabled cursor-pointer",
    },
    size: {
      small: "button--small text-sm py-1 px-2",
      medium: "button--medium text-base py-2 px-4",
      large: "button--large text-lg py-2.5 px-4",
    },
  },
  compoundVariants: [
    {
      intent: "primary",
      size: "medium",
      className: "button--primary-medium uppercase",
    },
    {
      intent: "warning",
      disabled: false,
      className: "button--warning-enabled text-gray-800",
    },
    {
      intent: "warning",
      disabled: true,
      className: "button--warning-disabled text-black",
    },
    {
      intent: ["warning", "danger"],
      className: "button--warning-danger !border-red-500",
    },
  ],
  defaultVariants: {
    disabled: false,
    intent: "primary",
    size: "medium",
  },
} as any;

/* Scenarios
  ============================================ */

function registerBenchmarks(mod: typeof local) {
  bench("cva: create", () => {
    mod.cva(buttonConfig);
  });

  const buttonVariants = mod.cva(buttonConfig);

  bench("cva: call defaults", () => {
    buttonVariants({});
  });

  bench("cva: call with props", () => {
    buttonVariants({ intent: "primary", disabled: true } as any);
    buttonVariants({ intent: "primary", size: "medium" } as any);
    buttonVariants({
      intent: "warning",
      size: "medium",
      disabled: true,
    } as any);
    buttonVariants({ size: "small" } as any);
    buttonVariants({ size: "large", intent: "danger" } as any);
  });

  bench("cx: many args", () => {
    mod.cx(
      "button",
      ["extra-one", { active: true, disabled: false }],
      undefined,
      false && "not-rendered",
      "trailing",
    );
  });

  bench("compose: two components", () => {
    const buttonA = mod.cva(buttonConfig);
    const buttonB = mod.cva({ base: "icon" });
    const composed = mod.compose(buttonA, buttonB);
    composed({ intent: "secondary" } as any);
  });
}

/* Implementations
  ============================================ */

interface BaselineEntry {
  package: string;
  label: string;
  version: string;
  dir?: string;
  skipped?: string;
}

async function loadBaselines(): Promise<BaselineEntry[]> {
  const baselinesDir = process.env.BENCH_BASELINES_DIR;
  if (!baselinesDir) return [];

  const manifestPath = path.join(baselinesDir, "manifest.json");
  let manifest: { entries: BaselineEntry[] };
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return [];
  }

  return manifest.entries.filter((entry) => entry.package === "cva");
}

const baselines = await loadBaselines();

describe("local", () => {
  registerBenchmarks(local);
});

for (const entry of baselines) {
  if (entry.skipped || !entry.dir) continue;

  const modPath = path.join(
    process.env.BENCH_BASELINES_DIR!,
    entry.dir,
    "node_modules/cva/dist/index.mjs",
  );

  let baselineMod: typeof local | undefined;
  try {
    baselineMod = await import(pathToFileURL(modPath).href);
  } catch {
    // API drift or missing baseline — silently skip; the manifest already
    // records installation failures, and report.ts renders a note for any
    // baseline that never produced a benchmark group.
    baselineMod = undefined;
  }

  if (!baselineMod) continue;

  describe(`${entry.label}@${entry.version}`, () => {
    registerBenchmarks(baselineMod!);
  });
}
