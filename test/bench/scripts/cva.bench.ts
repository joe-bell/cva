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

// 24 prop shapes that all carry the same key count (the three variant keys
// plus exactly one extra key) and the same values, differing only in key
// insertion order and the extra key's name. Enumeration work is therefore
// constant across them and only hidden-class polymorphism varies, so the
// megamorphic task measures megamorphism rather than "more keys".
const megamorphicProps = [
  { intent: "primary", size: "medium", disabled: false, role: "button" },
  { intent: "primary", disabled: false, size: "medium", role: "button" },
  { size: "medium", intent: "primary", disabled: false, role: "button" },
  { size: "medium", disabled: false, intent: "primary", role: "button" },
  { disabled: false, intent: "primary", size: "medium", role: "button" },
  { disabled: false, size: "medium", intent: "primary", role: "button" },
  { intent: "primary", size: "medium", disabled: false, title: "button" },
  { intent: "primary", disabled: false, size: "medium", title: "button" },
  { size: "medium", intent: "primary", disabled: false, title: "button" },
  { size: "medium", disabled: false, intent: "primary", title: "button" },
  { disabled: false, intent: "primary", size: "medium", title: "button" },
  { disabled: false, size: "medium", intent: "primary", title: "button" },
  { intent: "primary", size: "medium", disabled: false, slot: "button" },
  { intent: "primary", disabled: false, size: "medium", slot: "button" },
  { size: "medium", intent: "primary", disabled: false, slot: "button" },
  { size: "medium", disabled: false, intent: "primary", slot: "button" },
  { disabled: false, intent: "primary", size: "medium", slot: "button" },
  { disabled: false, size: "medium", intent: "primary", slot: "button" },
  { intent: "primary", size: "medium", disabled: false, lang: "button" },
  { intent: "primary", disabled: false, size: "medium", lang: "button" },
  { size: "medium", intent: "primary", disabled: false, lang: "button" },
  { size: "medium", disabled: false, intent: "primary", lang: "button" },
  { disabled: false, intent: "primary", size: "medium", lang: "button" },
  { disabled: false, size: "medium", intent: "primary", lang: "button" },
] as any[];

// Compound matching evaluates a compound's selectors in key insertion order
// and stops at the first miss, so every compound below keeps `intent` last
// and matches on the keys before it for both prop sets. The "none matching"
// props (`intent: "primary"`) therefore fail each compound on its *last*
// selector, and both tasks evaluate every selector rather than one
// measuring an early exit.
const compoundHeavyConfig = {
  base: "button font-semibold border rounded",
  variants: buttonConfig.variants,
  compoundVariants: [
    { size: "medium", disabled: false, intent: "danger", className: "cv-a" },
    {
      disabled: false,
      size: "medium",
      intent: ["danger", "warning"],
      className: "cv-b",
    },
    {
      size: ["small", "medium", "large"],
      disabled: false,
      intent: ["danger"],
      className: "cv-c",
    },
    {
      disabled: [true, false],
      size: "medium",
      intent: "danger",
      className: "cv-d",
    },
    {
      size: "medium",
      disabled: false,
      intent: ["warning", "danger"],
      className: "cv-e",
    },
    {
      disabled: false,
      size: ["medium", "large"],
      intent: "danger",
      className: "cv-f",
    },
    {
      size: "medium",
      disabled: [false],
      intent: ["danger", "secondary"],
      className: "cv-g",
    },
    {
      disabled: false,
      size: "medium",
      intent: ["danger", "warning", "secondary"],
      className: "cv-h",
    },
    { size: ["medium"], disabled: false, intent: "danger", className: "cv-i" },
    {
      disabled: false,
      size: "medium",
      intent: ["danger"],
      className: "cv-j",
    },
    // The last two miss on `intent: "danger"` too, so "mostly matching" is
    // 10 of 12 rather than a full sweep.
    { size: "medium", disabled: false, intent: "secondary", className: "cv-k" },
    {
      disabled: false,
      size: "medium",
      intent: ["secondary", "warning"],
      className: "cv-l",
    },
  ],
  defaultVariants: buttonConfig.defaultVariants,
} as any;

const compoundsMostlyMatching = {
  intent: "danger",
  size: "medium",
  disabled: false,
} as any;
const compoundsNoneMatching = {
  intent: "primary",
  size: "medium",
  disabled: false,
} as any;

// One render pass' worth of props: 60 objects of a single shape, rotated
// across the components so no component sees the same props every op.
const intents = ["primary", "secondary", "warning", "danger"];
const sizes = ["small", "medium", "large"];
const renderPassProps = Array.from({ length: 60 }, (_, index) => ({
  intent: intents[index % intents.length],
  size: sizes[index % sizes.length],
  disabled: index % 2 === 0,
  className: index % 5 === 0 ? "ds-override" : undefined,
})) as any[];

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
  // The existing tasks discard their result, and changing that would change
  // their workload, so only the tasks added below write to this sink. It
  // holds the full returned string (not its `.length`) so the class name is
  // really materialised and can't be optimised away.
  let sink: unknown;

  // Per-task rotation cursors. These live here, not at module scope, so the
  // local and baseline registrations don't share warmup state.
  let megamorphicIndex = 0;
  let renderPassIndex = 0;

  bench(
    "Create component (one-time setup)",
    () => {
      mod.cva(buttonConfig);
    },
    BENCH_OPTIONS,
  );

  const buttonVariants = mod.cva(buttonConfig);
  const baseOnly = mod.cva({ base: "button font-semibold border rounded" });
  const variantsWithoutCompounds = mod.cva({
    base: "button font-semibold border rounded",
    variants: buttonConfig.variants,
    defaultVariants: buttonConfig.defaultVariants,
  });

  bench(
    "Call component (base only)",
    () => {
      baseOnly();
    },
    BENCH_OPTIONS,
  );

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
    "Call component (variants without compounds)",
    () => {
      variantsWithoutCompounds({ intent: "primary", size: "medium" } as any);
    },
    BENCH_OPTIONS,
  );

  bench(
    "Call component (explicit undefined props)",
    () => {
      buttonVariants({
        intent: undefined,
        disabled: undefined,
        size: undefined,
      } as any);
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
    "Call component (megamorphic props)",
    () => {
      sink = buttonVariants(megamorphicProps[megamorphicIndex]);
      megamorphicIndex = (megamorphicIndex + 1) % megamorphicProps.length;
    },
    BENCH_OPTIONS,
  );

  bench(
    "Call component (props and className)",
    () => {
      sink = buttonVariants({
        intent: "secondary",
        size: "large",
        className: "ml-2 w-full",
      } as any);
    },
    BENCH_OPTIONS,
  );

  const compoundHeavy = mod.cva(compoundHeavyConfig);

  bench(
    "Call component (compound variants, mostly matching)",
    () => {
      sink = compoundHeavy(compoundsMostlyMatching);
    },
    BENCH_OPTIONS,
  );

  bench(
    "Call component (compound variants, none matching)",
    () => {
      sink = compoundHeavy(compoundsNoneMatching);
    },
    BENCH_OPTIONS,
  );

  // The three `x20` tasks repeat a sub-100ns body 20 times so the result
  // clears tinybench's ~100ns timer floor. Their reported ops/s is therefore
  // per batch of 20 calls, not per call — multiply by 20 to compare them with
  // the single-call tasks above (or divide the reported latency by 20).
  bench(
    "Call component (base only, x20)",
    () => {
      for (let index = 0; index < 20; index++) {
        sink = baseOnly();
      }
    },
    BENCH_OPTIONS,
  );

  bench(
    "Call component (base only, className, x20)",
    () => {
      for (let index = 0; index < 20; index++) {
        sink = baseOnly({ className: "ml-2 w-full" });
      }
    },
    BENCH_OPTIONS,
  );

  bench(
    "Join class names (x20)",
    () => {
      for (let index = 0; index < 20; index++) {
        sink = mod.cx(
          "button",
          ["extra-one", { active: true, disabled: false }],
          undefined,
          false && "not-rendered",
          "trailing",
        );
      }
    },
    BENCH_OPTIONS,
  );

  // Older published betas expose `defineConfig` with different behaviour, so
  // probe what it actually does to the output rather than its type.
  const supportsHooks = (() => {
    try {
      const probe = (mod as any).defineConfig({
        hooks: { onComplete: (className: string) => `${className} hooked` },
      });
      return probe.cva({ base: "p" })({}).endsWith("hooked");
    } catch {
      return false;
    }
  })();

  if (supportsHooks) {
    const hooked = (mod as any).defineConfig({
      hooks: { onComplete: (className: string) => `${className} hooked` },
    });
    const hookedButton = hooked.cva(buttonConfig);

    bench(
      "Call component (hook)",
      () => {
        sink = hookedButton({ intent: "primary", size: "medium" });
      },
      BENCH_OPTIONS,
    );
  }

  if (supportsComposes(mod)) {
    const buttonA = mod.cva(buttonConfig);
    const buttonB = mod.cva({ base: "icon" });
    const composed = mod.cva({ composes: [buttonA, buttonB] } as any);

    bench(
      "Call composed component (prebuilt)",
      () => {
        composed({ intent: "secondary" } as any);
      },
      BENCH_OPTIONS,
    );

    bench(
      "Compose components (setup + call)",
      () => {
        const buttonA = mod.cva(buttonConfig);
        const buttonB = mod.cva({ base: "icon" });
        const composed = mod.cva({ composes: [buttonA, buttonB] } as any);
        composed({ intent: "secondary" } as any);
      },
      BENCH_OPTIONS,
    );

    const nested = mod.cva({
      composes: [mod.cva({ composes: [buttonA, buttonB] } as any), buttonB],
    } as any);

    bench(
      "Call composed component (nested)",
      () => {
        sink = nested({ intent: "secondary" } as any);
      },
      BENCH_OPTIONS,
    );

    // One op = a whole render pass: 30 components (base-only, variants-only,
    // variants plus compounds, and a few composed) each called with a
    // rotating prop object. Built identically for every implementation, so
    // the row stays comparable across baselines — and registered only where
    // `composes` works, since the fixture itself must not vary by version.
    const renderPassComponents = [
      ...Array.from({ length: 10 }, (_, index) =>
        mod.cva({ base: `ds-${index} p-2 rounded` }),
      ),
      ...Array.from({ length: 10 }, (_, index) =>
        mod.cva({
          base: `ds-variants-${index} p-2 rounded`,
          variants: buttonConfig.variants,
          defaultVariants: buttonConfig.defaultVariants,
        } as any),
      ),
      ...Array.from({ length: 7 }, (_, index) =>
        mod.cva({
          ...compoundHeavyConfig,
          base: `ds-compound-${index} p-2 rounded`,
        } as any),
      ),
      ...Array.from({ length: 3 }, (_, index) =>
        mod.cva({
          base: `ds-composed-${index}`,
          composes: [buttonVariants, buttonB],
        } as any),
      ),
    ];

    bench(
      "Design system render pass",
      () => {
        const offset = renderPassIndex;
        for (let index = 0; index < renderPassComponents.length; index++) {
          sink = renderPassComponents[index](
            renderPassProps[(offset + index) % renderPassProps.length],
          );
        }
        renderPassIndex = (renderPassIndex + 1) % renderPassProps.length;
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
