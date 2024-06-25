import { Bench } from "tinybench";

import { defineConfig as originalDefineConfig } from "./old-index";
import { defineConfig as enhancedDefineConfig } from "./index";

function logResultsTable(bench: Bench) {
  const table: any[] = [];

  for (const task of bench.tasks) {
    if (!task.result) continue;
    table.push({
      name: task.name,
      "ops/sec": task.result.error ? 0 : task.result.hz,
      "average (ms)": task.result.error ? "NaN" : task.result.mean.toFixed(3),
      samples: task.result.error ? "NaN" : task.result.samples.length,
    });
  }

  const results = table
    .map((x) => ({
      ...x,
      "ops/sec": parseFloat(parseInt(x["ops/sec"].toString(), 10).toString()),
    }))
    .sort(
      (a: Record<string, number>, b: Record<string, number>) =>
        b["ops/sec"] - a["ops/sec"],
    );

  const maxOps = Math.max(...results.map((x) => x["ops/sec"]));

  console.table(
    results.map((x, i) => ({
      ...x,
      [`relative to ${results[0]["name"]}`]:
        i === 0
          ? ""
          : `${(maxOps / parseInt(x["ops/sec"])).toFixed(2)} x slower`,
    })),
  );
}

const originalCVA = originalDefineConfig().cva;
const enhancedCVA = enhancedDefineConfig().cva;

const buttonWithoutBaseWithDefaultsWithClassNameString = {
  base: "button font-semibold border rounded",
  variants: {
    intent: {
      unset: null,
      primary:
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600",
      secondary:
        "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
      warning:
        "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600",
      danger: [
        "button--danger",
        [
          1 && "bg-red-500",
          { baz: false, bat: null },
          ["text-white", ["border-transparent"]],
        ],
        "hover:bg-red-600",
      ],
    },
    disabled: {
      unset: null,
      true: "button--disabled opacity-050 cursor-not-allowed",
      false: "button--enabled cursor-pointer",
    },
    size: {
      unset: null,
      small: "button--small text-sm py-1 px-2",
      medium: "button--medium text-base py-2 px-4",
      large: "button--large text-lg py-2.5 px-4",
    },
    m: {
      unset: null,
      0: "m-0",
      1: "m-1",
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
      className: [
        "button--warning-disabled",
        [1 && "text-black", { baz: false, bat: null }],
      ],
    },
    {
      intent: ["warning", "danger"],
      className: "button--warning-danger !border-red-500",
    },
    {
      intent: ["warning", "danger"],
      size: "medium",
      className: "button--warning-danger-medium",
    },
  ],
  defaultVariants: {
    m: 0,
    disabled: false,
    intent: "primary",
    size: "medium",
  },
} as any;

async function run() {
  const benchmark = new Bench({ time: 5000 });

  benchmark.add("cva/main", () => {
    const buttonVariants = originalCVA(
      buttonWithoutBaseWithDefaultsWithClassNameString,
    );
    buttonVariants({});
    buttonVariants({ intent: "primary", disabled: true } as any);
    buttonVariants({ intent: "primary", size: "medium" } as any);
    buttonVariants({
      intent: "warning",
      size: "medium",
      disabled: true,
    } as any);
    buttonVariants({ size: "small" } as any);
    buttonVariants({ size: "large", intent: "unset" } as any);
  });

  benchmark.add("feat/performance-enhancement", () => {
    const buttonVariants = enhancedCVA(
      buttonWithoutBaseWithDefaultsWithClassNameString,
    );
    buttonVariants({});
    buttonVariants({ intent: "primary", disabled: true } as any);
    buttonVariants({ intent: "primary", size: "medium" } as any);
    buttonVariants({
      intent: "warning",
      size: "medium",
      disabled: true,
    } as any);
    buttonVariants({ size: "small" } as any);
    buttonVariants({ size: "large", intent: "unset" } as any);
  });

  await benchmark.warmup();
  await benchmark.run();
  logResultsTable(benchmark);

  process.exit();
}

run();
