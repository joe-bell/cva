import path from "node:path";
import { fileURLToPath } from "node:url";

import { bench, describe } from "vitest";

import type * as local from "class-variance-authority";

import { BENCH_OPTIONS, loadImplementations } from "./harness";

/* Fixture
  ============================================ */

const base = "button font-semibold border rounded";

const variants = {
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
} as any;

const compoundVariants = [
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
] as any;

const defaultVariants = {
  disabled: false,
  intent: "primary",
  size: "medium",
} as any;

/* Scenarios
  ============================================ */

function registerBenchmarks(mod: typeof local) {
  bench(
    "Create component (one-time setup)",
    () => {
      mod.cva(base, { variants, compoundVariants, defaultVariants });
    },
    BENCH_OPTIONS,
  );

  const buttonVariants = mod.cva(base, {
    variants,
    compoundVariants,
    defaultVariants,
  });

  bench(
    "Call component (default variants)",
    () => {
      buttonVariants({});
    },
    BENCH_OPTIONS,
  );

  bench(
    "Call component (with variants)",
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
    "Join class names",
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

  bench(
    "Compose components (manual cx join)",
    () => {
      const buttonA = mod.cva(base, {
        variants,
        compoundVariants,
        defaultVariants,
      });
      const buttonB = mod.cva("icon");
      const composed = (props: any) => mod.cx(buttonA(props), buttonB(props));
      composed({ intent: "secondary" });
    },
    BENCH_OPTIONS,
  );
}

/* Implementations
  ============================================ */

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../packages/class-variance-authority",
);
const implementations = await loadImplementations<typeof local>(
  "class-variance-authority",
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
