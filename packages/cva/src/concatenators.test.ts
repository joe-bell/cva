/**
 * The real-package concatenator matrix: every supported swap target is
 * exercised through `cva`/`cx` with its actual published package, covering
 * both type assignability against the default `CX` contract and runtime
 * behavior using that concatenator's own features.
 *
 * The registry-narrowed contract (`CVARegistry` augmentation, which lets a
 * bare `twMerge` typecheck) cannot be tested here — module augmentation
 * applies to the whole compilation — so it lives in the isolated
 * `type-tests/registry.ts` compile instead (`pnpm --filter cva check:registry`).
 */
import { clsx } from "clsx";
import { clsx as clsxLite } from "clsx/lite";
import { cn } from "cnfast";
import { twMerge } from "tailwind-merge";
import type * as CVA from "./";
import { cva, cx } from "./";
import { defineConfig } from "./core";

describe("clsx (the `cva` preset default)", () => {
  test("is directly assignable to the default contract", () => {
    expectTypeOf(clsx).toMatchTypeOf<CVA.CX>();
  });

  test("cx behaves as an alias of clsx across the full grammar", () => {
    const inputs: CVA.ClassValue[][] = [
      ["foo", ["bar", { baz: true, qux: false }], 1],
      [null, undefined, false, true, ""],
      [[[["deeply", ["nested"]]], { object: 1 }]],
    ];

    for (const input of inputs) {
      expect(cx(...input)).toBe(clsx(...input));
    }
  });

  test("components support clsx's full authoring grammar", () => {
    const badge = cva({
      base: ["badge", { "badge--raised": true, "badge--flat": false }],
      variants: {
        tone: { info: { "bg-blue-500": true }, warn: "bg-yellow-500" },
      },
      defaultVariants: { tone: "info" },
    });

    expect(badge()).toBe("badge badge--raised bg-blue-500");
    expect(badge({ tone: "warn", class: ["extra", { on: true }] })).toBe(
      "badge badge--raised bg-yellow-500 extra on",
    );
  });
});

describe("clsx/lite", () => {
  const { cva: liteCva, cx: liteCx } = defineConfig({ cx: clsxLite });

  test("is directly assignable to the default contract", () => {
    // Note this is clsx/lite's own (over-broad) published typing: its
    // runtime only understands string arguments. See the dropping test
    // below — the runtime limitation is lite's documented contract.
    expectTypeOf(clsxLite).toMatchTypeOf<CVA.CX>();
  });

  test("string-authored components work fully", () => {
    const box = liteCva({ base: "box" });
    const button = liteCva({
      composes: [box],
      base: "font-semibold border rounded",
      variants: {
        intent: { primary: "bg-blue-500", secondary: "bg-white" },
        disabled: { true: "opacity-50", false: "" },
      },
      compoundVariants: [
        { intent: "primary", disabled: true, class: "cursor-not-allowed" },
      ],
      defaultVariants: { intent: "primary", disabled: false },
    });

    expect(button()).toBe("box font-semibold border rounded bg-blue-500");
    expect(button({ intent: "primary", disabled: true, class: "extra" })).toBe(
      "box font-semibold border rounded bg-blue-500 opacity-50 cursor-not-allowed extra",
    );
  });

  test("documents lite's contract: non-string authored values are dropped", () => {
    // clsx/lite ignores anything that isn't a string, including the arrays
    // and objects that clsx (and therefore the `cva` preset) would resolve.
    // Authoring these under lite is a silent no-op by lite's own design.
    expect(liteCx("kept", ["dropped"], { dropped: true }, 1)).toBe("kept");

    const badge = liteCva({
      base: ["array-authored-base"],
      variants: { tone: { info: { "object-authored": true } } },
      defaultVariants: { tone: "info" },
    });

    expect(badge({ class: "kept" })).toBe("kept");
  });
});

describe("tailwind-merge", () => {
  // Bare `twMerge` fails the default `ClassValue` contract by design (no
  // objects/numbers) — the cast documents that string/array authoring is
  // the user's responsibility here. Augmenting `CVARegistry` makes the bare
  // assignment typecheck and enforces that authoring surface instead; see
  // `type-tests/registry.ts`.
  const { cva: twCva, cx: twCx } = defineConfig({ cx: twMerge as CVA.CX });

  test("resolves conflicts across base, variants, and the class prop", () => {
    const button = twCva({
      base: "font-semibold bg-gray-200 border rounded",
      variants: {
        intent: {
          primary: "bg-blue-500 text-white border-transparent",
          secondary: "bg-white text-gray-800 border-gray-400",
        },
      },
      defaultVariants: { intent: "primary" },
    });

    // Variant `bg-*` wins over base `bg-gray-200`.
    expect(button()).toBe(
      "font-semibold border rounded bg-blue-500 text-white border-transparent",
    );
    // The `class` prop wins over both.
    expect(button({ class: "bg-red-500" })).toBe(
      "font-semibold border rounded text-white border-transparent bg-red-500",
    );
  });

  test("accepts twMerge's own grammar: strings and (nested) arrays", () => {
    const badge = twCva({
      base: ["px-2", ["py-1", "bg-gray-100"]],
      variants: { tone: { info: "bg-blue-500" } },
    });

    expect(badge({ tone: "info" })).toBe("px-2 py-1 bg-blue-500");
    expect(twCx("bg-gray-200", ["bg-blue-500"])).toBe("bg-blue-500");
  });
});

describe("cnfast", () => {
  const { cva: cnCva, cx: cnCx } = defineConfig({ cx: cn });

  test("is directly assignable to the default contract", () => {
    expectTypeOf(cn).toMatchTypeOf<CVA.CX>();
  });

  test("supports the full grammar with tailwind-merge conflict resolution", () => {
    const button = cnCva({
      base: ["font-semibold bg-gray-200", { border: true, rounded: true }],
      variants: {
        intent: {
          primary: "bg-blue-500 text-white",
          secondary: "bg-white text-gray-800",
        },
      },
      defaultVariants: { intent: "primary" },
    });

    // Object/array authoring resolves like clsx, and the variant `bg-*`
    // strips the conflicting base `bg-gray-200` like tailwind-merge.
    expect(button()).toBe(
      "font-semibold border rounded bg-blue-500 text-white",
    );
    expect(button({ class: { "bg-red-500": true } })).toBe(
      "font-semibold border rounded text-white bg-red-500",
    );

    expect(cnCx("bg-gray-200", { "bg-blue-500": true })).toBe("bg-blue-500");
  });
});
