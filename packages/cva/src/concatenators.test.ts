/**
 * The real-package concatenator matrix: every supported swap target is
 * exercised through `cva`/`cx` with its actual published package, covering
 * both the inferred authoring surface (`CXInput`) and runtime behavior
 * using that concatenator's own features.
 */
import { clsx } from "clsx";
import { clsx as clsxLite } from "clsx/lite";
import { cn } from "cn";
import { twMerge } from "tailwind-merge";
import type * as CVA from "./";
import { cva, cx } from "./";
import { defineConfig, getSchema } from "./core";

describe("clsx (the `cva` preset default)", () => {
  test("infers the full ClassValue authoring surface", () => {
    expectTypeOf(clsx).toMatchTypeOf<CVA.CX>();
    expectTypeOf<CVA.CXInput<typeof clsx>>().toEqualTypeOf<CVA.ClassValue>();
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

  test("infers the full ClassValue authoring surface (lite's own typing)", () => {
    // Note this is clsx/lite's own (over-broad) published typing: its
    // runtime only understands string arguments, so inference cannot
    // narrow further. See the dropping test below — the runtime
    // limitation is lite's documented contract.
    expectTypeOf(clsxLite).toMatchTypeOf<CVA.CX>();
    expectTypeOf<
      CVA.CXInput<typeof clsxLite>
    >().toEqualTypeOf<CVA.ClassValue>();
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
  // Bare `twMerge` works out of the box: the authoring surface is inferred
  // from its parameters (`ClassNameValue` — strings and arrays, no objects
  // or numbers) and enforced at compile time; see the inference test below.
  const {
    cva: twCva,
    cx: twCx,
    compose: twCompose,
  } = defineConfig({
    cx: twMerge,
  });

  test("narrows the authoring surface to twMerge's own ClassNameValue", () => {
    expectTypeOf<CVA.CXInput<typeof twMerge>>().toEqualTypeOf<
      Parameters<typeof twMerge>[number]
    >();

    twCva({
      // @ts-expect-error — objects aren't part of tailwind-merge's ClassNameValue
      base: { "bg-gray-200": true },
    });
    twCva({
      // @ts-expect-error — object-syntax variant values fail the variants gate
      variants: { intent: { primary: { "bg-blue-500": true } } },
    });
  });

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

  test("narrowed components still compose and introspect", () => {
    // The narrowed `class`/`className` prop must not reject a component
    // from `composes`, `compose`, or `getSchema` via props contravariance.
    const box = twCva({
      base: "p-4 bg-gray-100",
      variants: { pad: { none: "p-0" } },
    });
    const button = twCva({
      composes: [box],
      base: "font-semibold",
      variants: { intent: { primary: "bg-blue-500", secondary: "bg-white" } },
      defaultVariants: { intent: "primary" },
    });
    const card = twCompose(box, button);

    // Conflict resolution still runs across the composed output: the
    // variant `bg-*` strips the composed `bg-gray-100`.
    expect(button({ pad: "none", class: "text-white" })).toBe(
      "p-0 font-semibold bg-blue-500 text-white",
    );
    expect(card({ pad: "none", intent: "secondary" })).toBe(
      "p-0 font-semibold bg-white",
    );
    expectTypeOf<CVA.VariantProps<typeof button>>().toEqualTypeOf<{
      pad?: "none" | undefined;
      intent?: "primary" | "secondary" | undefined;
    }>();
    // @ts-expect-error — the narrowed class prop survives composition
    button({ class: { "text-white": true } });
    // @ts-expect-error — and the deprecated `compose` too
    card({ class: { "text-white": true } });

    expect(getSchema(button)).toEqual({
      pad: { values: ["none"] },
      intent: { values: ["primary", "secondary"], defaultValue: "primary" },
    });
    expectTypeOf(getSchema(button)).toEqualTypeOf<{
      pad: { values: readonly "none"[] };
      intent: {
        values: readonly ("primary" | "secondary")[];
        defaultValue: "primary";
      };
    }>();
  });
});

describe("cn", () => {
  const { cva: cnCva, cx: cnCx } = defineConfig({ cx: cn });

  test("infers the full ClassValue authoring surface", () => {
    // `cn`'s own `ClassValue` is structurally identical to cva's, so the
    // authoring surface is unchanged from the clsx default.
    expectTypeOf(cn).toMatchTypeOf<CVA.CX>();
    expectTypeOf<CVA.CXInput<typeof cn>>().toEqualTypeOf<CVA.ClassValue>();
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
