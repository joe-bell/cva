import path from "node:path";
import { fileURLToPath } from "node:url";

import { bench, describe } from "vitest";

import type * as local from "cva";

import { BENCH_OPTIONS, loadImplementations } from "./harness";

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

// Published versions before `composes` (e.g. `cva@1.0.0-beta.4`) destructure
// only the config keys they know about, so a `composes` property is
// silently ignored rather than throwing — benching it there would measure a
// no-op and render a meaningless delta. Feature-detect per implementation
// and only register the scenario where it actually composes.
function supportsComposes(mod: typeof local): boolean {
  try {
    const probe = mod.cva({
      composes: mod.cva({ base: "probe" }),
    } as any);
    return probe({}).includes("probe");
  } catch {
    return false;
  }
}

function registerBenchmarks(mod: typeof local) {
  bench(
    "cva: create",
    () => {
      mod.cva(buttonConfig);
    },
    BENCH_OPTIONS,
  );

  const buttonVariants = mod.cva(buttonConfig);

  bench(
    "cva: call defaults",
    () => {
      buttonVariants({});
    },
    BENCH_OPTIONS,
  );

  bench(
    "cva: call with props",
    () => {
      buttonVariants({ intent: "primary", disabled: true } as any);
      buttonVariants({ intent: "primary", size: "medium" } as any);
      buttonVariants({
        intent: "warning",
        size: "medium",
        disabled: true,
      } as any);
      buttonVariants({ size: "small" } as any);
      buttonVariants({ size: "large", intent: "danger" } as any);
    },
    BENCH_OPTIONS,
  );

  bench(
    "cx: many args",
    () => {
      mod.cx(
        "button",
        ["extra-one", { active: true, disabled: false }],
        undefined,
        false && "not-rendered",
        "trailing",
      );
    },
    BENCH_OPTIONS,
  );

  if (supportsComposes(mod)) {
    bench(
      "composes: two components",
      () => {
        const buttonA = mod.cva(buttonConfig);
        const buttonB = mod.cva({ base: "icon" });
        const composed = mod.cva({ composes: [buttonA, buttonB] } as any);
        composed({ intent: "secondary" } as any);
      },
      BENCH_OPTIONS,
    );
  }
}

/* Implementations
  ============================================ */

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../packages/cva",
);
const implementations = await loadImplementations<typeof local>(
  "cva",
  packageDir,
  // Guards `registerBenchmarks` against export drift in an old baseline:
  // it calls `mod.cva`/`mod.cx` at registration time, and an undefined
  // export there would fail the whole bench file, not just the baseline.
  (mod) => typeof mod.cva === "function" && typeof mod.cx === "function",
);

for (const impl of implementations) {
  const describeName =
    impl.label === "local" ? "local" : `${impl.label}@${impl.version}`;
  describe(describeName, () => {
    registerBenchmarks(impl.mod);
  });
}
