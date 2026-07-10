import path from "node:path";
import { fileURLToPath } from "node:url";

import { bench, describe } from "vitest";

import type * as local from "../../packages/class-variance-authority/src/index";

import { loadImplementations } from "./harness";

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
  bench("cva: create", () => {
    mod.cva(base, { variants, compoundVariants, defaultVariants });
  });

  const buttonVariants = mod.cva(base, {
    variants,
    compoundVariants,
    defaultVariants,
  });

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
}

/* Implementations
  ============================================ */

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../packages/class-variance-authority",
);
const implementations = await loadImplementations<typeof local>(
  "class-variance-authority",
  packageDir,
);

for (const impl of implementations) {
  const describeName =
    impl.label === "local" ? "local" : `${impl.label}@${impl.version}`;
  describe(describeName, () => {
    registerBenchmarks(impl.mod);
  });
}
