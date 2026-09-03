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
  const { cva: twCva, cx: twCx } = defineConfig({ cx: twMerge });

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
    // from `composes` or `getSchema` via props contravariance.
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
    // Conflict resolution still runs across the composed output: the
    // variant `bg-*` strips the composed `bg-gray-100`.
    expect(button({ pad: "none", class: "text-white" })).toBe(
      "p-0 font-semibold bg-blue-500 text-white",
    );
    expectTypeOf<CVA.VariantProps<typeof button>>().toEqualTypeOf<{
      pad?: "none" | undefined;
      intent?: "primary" | "secondary" | undefined;
    }>();
    // @ts-expect-error — the narrowed class prop survives composition
    button({ class: { "text-white": true } });

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

/* Composition and introspection across the matrix
  ============================================ */

// `composes` and `getSchema` are first-class, so every concatenator runs the
// same composition suite: string-only authoring is the common denominator
// (clsx/lite and twMerge accept nothing richer), and each row's `output`
// normalizes the concatenator's own class conflict resolution — the
// assertions pin cva's assembly order, and the resolver is the row's own
// contract. Concatenator-specific grammar coverage lives in the suites above.
// Rows are typed against the string-only authoring surface so the matrix
// reads as one API rather than a union of differently-narrowed configs.
type Row = {
  name: string;
  api: { cva: CVA.CVA<string> };
  resolves: boolean;
};

const rows: Row[] = [
  {
    name: "clsx (the `cva` preset default)",
    api: { cva },
    resolves: false,
  },
  {
    name: "clsx/lite",
    api: defineConfig({ cx: clsxLite }),
    resolves: false,
  },
  {
    name: "tailwind-merge",
    api: defineConfig({ cx: twMerge }),
    resolves: true,
  },
  { name: "cn", api: defineConfig({ cx: cn }), resolves: true },
  {
    name: "an unannotated inline concatenator",
    api: defineConfig({ cx: (...inputs) => twMerge(clsx(inputs)) }),
    resolves: true,
  },
];

describe.each(rows)(
  "$name: composition and introspection",
  ({ api, resolves }) => {
    // Runs `twMerge` over the expected assembly for the resolving rows, so the
    // same literal documents both the raw order and the resolved output.
    const output = (assembled: string) =>
      resolves ? twMerge(assembled) : assembled;

    const box = api.cva({
      base: "box bg-gray-100",
      variants: {
        pad: { sm: "p-1", lg: "p-4" },
        tone: { muted: "text-gray-500" },
      },
      defaultVariants: { pad: "sm" },
    });
    const stack = api.cva({
      base: "stack",
      variants: {
        direction: { row: "flex-row", column: "flex-col" },
        // Overlaps `box`'s `pad`, contributing an extra value to the merge.
        pad: { none: "p-0" },
      },
      defaultVariants: { direction: "column", pad: "none" },
    });

    test("composes merges variants and defaults, local declarations winning", () => {
      const card = api.cva({
        composes: [box, stack],
        base: "card",
        variants: {
          tone: { loud: "text-black bg-blue-500" },
          // Redeclared locally with a new value; the local default below
          // overrides the composed ones (`box`'s `sm`, then `stack`'s `none`).
          pad: { xl: "p-8" },
        },
        // Compound variants may target keys that only composed components
        // declare (`direction`), matched against the merged defaults and
        // props.
        compoundVariants: [{ direction: "row", class: "compound" }],
        defaultVariants: { tone: "loud", pad: "xl" },
      });

      // The local `pad: "xl"` default wins over both composed defaults and
      // renders through `card`; the local `tone` default applies to the
      // merged `tone` variant.
      expect(card()).toBe(
        output(
          "box bg-gray-100 stack flex-col card text-black bg-blue-500 p-8",
        ),
      );
      // Props flow through to every composed component that declares them,
      // including a value only one of them knows about.
      // `tone: "muted"` is only declared by `box`, so it renders there; the
      // local `tone` variant contributes nothing for that value.
      expect(card({ pad: "none", direction: "row", tone: "muted" })).toBe(
        output(
          "box bg-gray-100 text-gray-500 stack flex-row p-0 card compound",
        ),
      );
      expect(card({ pad: "lg", class: "extra" })).toBe(
        output(
          "box bg-gray-100 p-4 stack flex-col card text-black bg-blue-500 extra",
        ),
      );

      expectTypeOf<CVA.VariantProps<typeof card>>().toEqualTypeOf<{
        pad?: "sm" | "lg" | "none" | "xl" | undefined;
        tone?: "muted" | "loud" | undefined;
        direction?: "row" | "column" | undefined;
      }>();
      // @ts-expect-error — values are checked against the merged variants
      card({ pad: "xxl" });
    });

    test("defaults and compound variants target composed keys without redeclaring them", () => {
      const card = api.cva({
        composes: [box, stack],
        base: "card",
        // Neither `pad` nor `direction` is declared locally: the default
        // overrides the composed ones, and the compound variant matches on
        // the composed keys' values.
        compoundVariants: [{ pad: "lg", direction: "row", class: "compound" }],
        defaultVariants: { pad: "lg", direction: "row" },
      });

      expect(card()).toBe(
        output("box bg-gray-100 p-4 stack flex-row card compound"),
      );
      expect(card({ direction: "column" })).toBe(
        output("box bg-gray-100 p-4 stack flex-col card"),
      );
      expect(getSchema(card)).toStrictEqual({
        pad: { values: ["sm", "lg", "none"], defaultValue: "lg" },
        tone: { values: ["muted"] },
        direction: { values: ["row", "column"], defaultValue: "row" },
      });
      // The authored defaults keep their literal types through the merge.
      expectTypeOf(getSchema(card).pad.defaultValue).toEqualTypeOf<"lg">();
      expectTypeOf(
        getSchema(card).direction.defaultValue,
      ).toEqualTypeOf<"row">();

      api.cva({
        composes: box,
        // @ts-expect-error — defaults are checked against the merged values
        defaultVariants: { pad: "xl" },
      });
      api.cva({
        composes: box,
        // @ts-expect-error — and so are compound variant selectors
        compoundVariants: [{ pad: "xl", class: "nope" }],
      });
      // @ts-expect-error — no variants anywhere, so no defaults
      api.cva({ base: "plain", defaultVariants: { pad: "sm" } });
    });

    test("composes accepts a single component", () => {
      const panel = api.cva({ composes: box, base: "panel" });

      expect(panel({ pad: "lg" })).toBe(output("box bg-gray-100 p-4 panel"));
      expectTypeOf<CVA.VariantProps<typeof panel>>().toEqualTypeOf<{
        pad?: "sm" | "lg" | undefined;
        tone?: "muted" | undefined;
      }>();
    });

    test("getSchema reflects the merged variants and defaults", () => {
      const card = api.cva({
        composes: [box, stack],
        variants: { tone: { loud: "text-black" }, pad: { xl: "p-8" } },
        defaultVariants: { tone: "loud", pad: "xl" },
      });
      const schema = getSchema(card);

      expect(schema).toStrictEqual({
        pad: { values: ["sm", "lg", "none", "xl"], defaultValue: "xl" },
        tone: { values: ["muted", "loud"], defaultValue: "loud" },
        direction: { values: ["row", "column"], defaultValue: "column" },
      });
      expectTypeOf(schema).toEqualTypeOf<{
        pad: {
          values: readonly ("sm" | "lg" | "none" | "xl")[];
          defaultValue: "xl";
        };
        tone: { values: readonly ("muted" | "loud")[]; defaultValue: "loud" };
        direction: {
          values: readonly ("row" | "column")[];
          defaultValue: "column";
        };
      }>();

      // Non-composed and variant-less components introspect too.
      expect(getSchema(box)).toStrictEqual({
        pad: { values: ["sm", "lg"], defaultValue: "sm" },
        tone: { values: ["muted"] },
      });
      const plain = getSchema(api.cva({ base: "plain" }));
      expect(plain).toStrictEqual({});
      expectTypeOf(plain).toEqualTypeOf<{}>();
      // Composing into a variant-less component still surfaces the merge.
      expect(
        getSchema(api.cva({ composes: box, base: "panel" })),
      ).toStrictEqual(getSchema(box));
    });
  },
);

describe("composition across configs", () => {
  const { cva: twCva } = defineConfig({ cx: twMerge });

  test("a preset component composes into a narrowed cva, and vice versa", () => {
    // Shared component libraries author against the `cva` preset; a
    // consumer wiring `twMerge` must still be able to compose them (the
    // composed output is a string, which every concatenator accepts).
    const presetBox = cva({
      base: ["box", { "bg-gray-100": true }],
      variants: { pad: { sm: "p-1" } },
      defaultVariants: { pad: "sm" },
    });
    const twCard = twCva({
      composes: presetBox,
      base: "card bg-blue-500",
    });
    expect(twCard()).toBe("box p-1 card bg-blue-500");
    expect(getSchema(twCard)).toStrictEqual({
      pad: { values: ["sm"], defaultValue: "sm" },
    });
    // The narrowed class prop still applies to the composing component.
    // @ts-expect-error — objects aren't part of tailwind-merge's grammar
    twCard({ class: { extra: true } });

    const twBox = twCva({ base: "box", variants: { pad: { sm: "p-1" } } });
    const presetCard = cva({ composes: twBox, base: { card: true } });
    expect(presetCard({ pad: "sm", class: { extra: true } })).toBe(
      "box p-1 card extra",
    );
    expect(getSchema(presetCard)).toStrictEqual({ pad: { values: ["sm"] } });
  });
});
