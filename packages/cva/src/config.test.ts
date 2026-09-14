import { clsx } from "clsx";
import { clsx as clsxLite } from "clsx/lite";
import { cn } from "cn";
import { twMerge } from "tailwind-merge";
import type * as CVA from "./config";
import { cva as presetCva, cx as presetCx } from "./";
import { defineConfig } from "./config";
import { getSchema } from "./tools";
import type * as Core from "./core";
import { defineConfig as coreDefineConfig } from "./core";

// The engine under test, reached through `cva/config` rather than the clsx
// preset: `cx` is the only thing the preset adds. The `preset*` imports above
// are the published `cva` entry point, used where a test is specifically about
// preset compatibility.
const { cva } = defineConfig<CVA.CX>({ cx: clsx });

describe("cva/config", () => {
  test("accepts only callbacks that can receive cva's assembled calls", () => {
    const mutableRest = (...inputs: string[]) => inputs.join(" ");
    const readonlyRest = (...inputs: readonly string[]) => inputs.join(" ");
    const requiredPrefix = (first: string, ...rest: string[]) =>
      [first, ...rest].join(" ");
    const finiteOptional = (first?: string, second?: string) =>
      [first, second].join(" ");
    const numbersOnly = (...inputs: number[]) => inputs.join(" ");
    const symbolsOnly = (...inputs: symbol[]) => inputs.map(String).join(" ");

    const strictCore = defineConfig({ cx: mutableRest });
    const child = strictCore.cva({ base: "child" });
    expect(strictCore.cva({ composes: child, base: "parent" })()).toBe(
      "child parent",
    );
    expectTypeOf<CVA.CXInput<typeof readonlyRest>>().toEqualTypeOf<string>();
    const { cva: readonlyCva } = defineConfig({ cx: readonlyRest });
    expect(readonlyCva({ base: "preset" })()).toBe("preset");
    expect(defineConfig({ cx: () => "constant" }).cva({})()).toBe("constant");

    // @ts-expect-error — cva can make an empty call
    defineConfig({ cx: (input: string) => input });
    // @ts-expect-error — a required prefix also rejects an empty call
    defineConfig({ cx: requiredPrefix });
    // @ts-expect-error — finite optional parameters can truncate assembled values
    defineConfig({ cx: finiteOptional });
    // @ts-expect-error — composed component results are strings, not numbers
    defineConfig({ cx: numbersOnly });
    // @ts-expect-error — symbols cannot receive composed class-name strings
    defineConfig({ cx: symbolsOnly });
    // @ts-expect-error — a literal-only rest cannot receive composed strings
    defineConfig({ cx: (...inputs: "only"[]) => inputs.join(" ") });
    // @ts-expect-error — a never rest is not a zero-argument constant callback
    defineConfig({ cx: (...inputs: never[]) => inputs.join(" ") });
    defineConfig({
      // @ts-expect-error — the optional prefix must also accept assembled strings
      cx: (first?: number, ...rest: string[]) =>
        first?.toFixed() ?? rest.join(" "),
    });
    const callbackUnion = null as unknown as
      | ((...inputs: string[]) => string)
      | ((first: string, ...rest: string[]) => string);
    defineConfig({
      // @ts-expect-error — every callback in a union must accept empty calls
      cx: callbackUnion,
    });
    const differentGrammars = null as unknown as
      | ((...inputs: CVA.ClassValue[]) => string)
      | ((...inputs: string[]) => string);
    defineConfig({
      // @ts-expect-error — every callback must accept the inferred union grammar
      cx: differentGrammars,
    });
    // Inference spans the union's parameter lists, so the widest grammar wins.
    // The constraint above therefore rejects the narrow arm.
    expectTypeOf<
      CVA.CXInput<typeof differentGrammars>
    >().toEqualTypeOf<CVA.ClassValue>();

    readonlyCva({
      // @ts-expect-error — object bases are outside a string-only grammar
      base: { button: true },
    });
    const readonlyButton = readonlyCva({
      base: "button",
      variants: { tone: { info: "info" } },
    });
    // @ts-expect-error — object class props are outside a string-only grammar
    readonlyButton({ class: { extra: true } });
    // @ts-expect-error — object className props are outside a string-only grammar
    readonlyButton({ className: { extra: true } });
    readonlyCva({
      variants: { tone: { info: "info" } },
      compoundVariants: [
        {
          tone: "info",
          // @ts-expect-error — compound class values use the configured grammar
          class: { extra: true },
        },
      ],
    });
    readonlyCva({
      variants: { tone: { info: "info" } },
      compoundVariants: [
        {
          tone: "info",
          // @ts-expect-error — compound className values use the configured grammar
          className: { extra: true },
        },
      ],
    });
  });

  test("retains any, unknown, inline, and overloaded callback inference", () => {
    const unknownRest = defineConfig({
      cx: (...inputs: unknown[]) => inputs.map(String).join(" "),
    });
    const anyRest = defineConfig({
      cx: (...inputs: any[]) => inputs.map(String).join(" "),
    });
    const inline = defineConfig({ cx: (...inputs) => inputs.join(" ") });
    interface OverloadedCX {
      (strings: TemplateStringsArray, ...values: string[]): string;
      (...inputs: CVA.ClassValue[]): string;
    }
    const overloaded: OverloadedCX = presetCx;
    const overloadedConfig = defineConfig({ cx: overloaded });

    expectTypeOf<
      CVA.CXInput<typeof unknownRest.cx>
    >().toEqualTypeOf<CVA.ClassValue>();
    expectTypeOf<
      CVA.CXInput<typeof anyRest.cx>
    >().toEqualTypeOf<CVA.ClassValue>();
    expectTypeOf<
      CVA.CXInput<typeof inline.cx>
    >().toEqualTypeOf<CVA.ClassValue>();
    expectTypeOf<
      CVA.CXInput<typeof overloaded>
    >().toEqualTypeOf<CVA.ClassValue>();
    expect(overloadedConfig.cva({ base: ["button", { active: true }] })()).toBe(
      "button active",
    );
  });

  test("requires a cx concatenator", () => {
    // @ts-expect-error — core's `defineConfig` has no default concatenator
    defineConfig({});
  });

  test("forwards inputs to the concatenator", () => {
    const join: CVA.CX = (...inputs) =>
      inputs.filter((input) => typeof input === "string" && input).join("|");

    const { cva: coreCva, cx: coreCx } = defineConfig({ cx: join });

    expect(coreCx("a", "b")).toBe("a|b");

    const baseOnly = coreCva({ base: "base" });
    expect(baseOnly({ class: "extra" })).toBe("base|extra");
    expect(baseOnly({ className: "last" })).toBe("base|last");
    expect(coreCva({ composes: baseOnly, base: "parent" })()).toBe(
      "base|parent",
    );

    const button = coreCva({
      base: "btn",
      variants: { size: { sm: "btn-sm" } },
    });
    expect(button({ size: "sm" })).toBe("btn|btn-sm");
  });

  test("receives assembled values verbatim, one argument each", () => {
    const calls: unknown[][] = [];
    const recording: CVA.CX = (...inputs) => {
      calls.push(inputs);
      return "recorded";
    };

    const { cva: configCva } = defineConfig({ cx: recording });

    const child = configCva({ base: "child" });
    const badge = configCva({
      composes: [child],
      base: ["badge", { "badge--raised": true }],
      variants: {
        tone: { info: { "bg-blue-500": true }, warn: "bg-yellow-500" },
      },
      compoundVariants: [{ tone: "info", class: "compound-info" }],
      defaultVariants: { tone: "info" },
    });

    expect(badge({ class: "extra" })).toBe("recorded");
    // The child renders before its parent.
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual(["child"]);
    // Authored arrays/objects stay intact; absent values are omitted.
    expect(calls[1]).toEqual([
      "recorded",
      ["badge", { "badge--raised": true }],
      { "bg-blue-500": true },
      "compound-info",
      "extra",
    ]);
  });

  test("infers the authoring surface from the concatenator's parameters", () => {
    const { cva: narrowCva, cx: narrowCx } = defineConfig({
      cx: (...inputs: (string | null | undefined | 0 | false)[]) =>
        inputs.filter(Boolean).join(" "),
    });

    const button = narrowCva({
      base: "font-semibold",
      variants: { intent: { primary: "bg-blue-500" } },
    });
    expect(button({ intent: "primary", class: "extra" })).toBe(
      "font-semibold bg-blue-500 extra",
    );
    expect(narrowCx("a", null, "b")).toBe("a b");

    narrowCva({
      // @ts-expect-error: objects aren't part of this concatenator's grammar
      base: { "bg-gray-200": true },
    });
    narrowCva({
      // @ts-expect-error: object-syntax variant values fail the variants gate
      variants: { intent: { primary: { "bg-blue-500": true } } },
    });
    // @ts-expect-error: object-syntax class props fail the same gate
    button({ intent: "primary", class: { extra: true } });
  });

  test("falls back to the full ClassValue grammar when nothing narrower is inferrable", () => {
    const { cva: inlineCva } = defineConfig({
      cx: (...inputs) => inputs.filter(Boolean).join("|"),
    });
    const { cva: unknownCva } = defineConfig({
      cx: (...inputs: unknown[]) => inputs.filter(Boolean).join("|"),
    });

    for (const configCva of [inlineCva, unknownCva]) {
      const badge = configCva({
        base: ["badge", { "badge--raised": true }],
        variants: { tone: { info: { "bg-blue-500": true } } },
      });
      expectTypeOf(badge).toBeFunction();
    }

    expectTypeOf<
      CVA.CXInput<(...inputs: unknown[]) => string>
    >().toEqualTypeOf<CVA.ClassValue>();
    expectTypeOf<CVA.CXInput<CVA.CX>>().toEqualTypeOf<CVA.ClassValue>();
    expectTypeOf<
      CVA.CXInput<(...inputs: string[]) => string>
    >().toEqualTypeOf<string>();
    // A parameter wider than cva's grammar narrows to their shared subset.
    // Object types such as `URL` already satisfy `ClassDictionary` and remain.
    expectTypeOf<
      CVA.CXInput<(...inputs: (string | symbol)[]) => string>
    >().toEqualTypeOf<string>();
  });

  test("a string-only concatenator never receives undefined", () => {
    const { cva: strictCva, cx: strictCx } = defineConfig({
      cx: (...inputs: string[]) =>
        inputs.map((input) => input.toUpperCase()).join(" "),
    });

    const box = strictCva({ base: "box" });
    const button = strictCva({
      composes: box,
      variants: { intent: { primary: "primary" }, size: { sm: "sm" } },
    });

    expect(box()).toBe("BOX");
    expect(button({ intent: "primary" })).toBe("BOX PRIMARY");
    expect(strictCx("a", "b")).toBe("A B");
  });
});

describe("cva/config's surface after the beta removals", () => {
  test("defineConfig returns `cva` and `cx`, and nothing else", () => {
    const configured = defineConfig({ cx: clsx });

    expect(Object.keys(configured).sort()).toStrictEqual(["cva", "cx"]);
    expectTypeOf<keyof typeof configured>().toEqualTypeOf<"cva" | "cx">();
    expect(configured.cva({ base: "canonical" })()).toBe("canonical");
  });

  test("no longer accepts hooks or names the `Compose` type", () => {
    // Restoring either name makes its directive unused (TS2578) and fails
    // `check:tsc`.
    defineConfig({
      cx: clsx,
      // @ts-expect-error: `hooks` is removed; wrap your own `cx` instead
      hooks: { onComplete: (className: string) => className },
    });

    // @ts-expect-error: `Compose` is removed; use `cva({ composes })`
    type RemovedCompose = CVA.Compose;
  });
});

describe("clsx/lite", () => {
  const { cva: liteCva, cx: liteCx } = defineConfig({ cx: clsxLite });

  test("infers the full ClassValue authoring surface (lite's own typing)", () => {
    // clsx/lite publishes the full clsx types despite only accepting strings.
    expectTypeOf(clsxLite).toExtend<CVA.CX>();
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

    expect(button()).toBe(
      "font-semibold border rounded bg-blue-500 text-white border-transparent",
    );
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
    expectTypeOf(cn).toExtend<CVA.CX>();
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

// Strings are the common authoring surface; grammar-specific tests are above.
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
    // Normalize expected assembly only for concatenators that resolve conflicts.
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
          pad: { xl: "p-8" },
        },
        compoundVariants: [{ direction: "row", class: "compound" }],
        defaultVariants: { tone: "loud", pad: "xl" },
      });

      expect(card()).toBe(
        output(
          "box bg-gray-100 stack flex-col card text-black bg-blue-500 p-8",
        ),
      );
      // Only box declares tone: "muted"; card contributes no local tone classes.
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

      expect(getSchema(box)).toStrictEqual({
        pad: { values: ["sm", "lg"], defaultValue: "sm" },
        tone: { values: ["muted"] },
      });
      const plain = getSchema(api.cva({ base: "plain" }));
      expect(plain).toStrictEqual({});
      expectTypeOf(plain).toEqualTypeOf<{}>();
      expect(
        getSchema(api.cva({ composes: box, base: "panel" })),
      ).toStrictEqual(getSchema(box));
    });
  },
);

describe("composition across configs", () => {
  const { cva: twCva } = defineConfig({ cx: twMerge });

  test("a preset component composes into a narrowed cva, and vice versa", () => {
    // Composition passes strings between configs, regardless of authored values.
    const presetBox = presetCva({
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
    // @ts-expect-error — objects aren't part of tailwind-merge's grammar
    twCard({ class: { extra: true } });

    const twBox = twCva({ base: "box", variants: { pad: { sm: "p-1" } } });
    const presetCard = presetCva({ composes: twBox, base: { card: true } });
    expect(presetCard({ pad: "sm", class: { extra: true } })).toBe(
      "box p-1 card extra",
    );
    expect(getSchema(presetCard)).toStrictEqual({ pad: { values: ["sm"] } });
  });
});

describe("cva/core (deprecated source shim)", () => {
  test("re-exports cva/config's defineConfig, identity intact", () => {
    expect(coreDefineConfig).toBe(defineConfig);
    expect(coreDefineConfig({ cx: clsx }).cva({ base: "shim" })()).toBe("shim");
  });

  test("still names every type it used to own", () => {
    expectTypeOf<Core.ClassValue>().toEqualTypeOf<CVA.ClassValue>();
    expectTypeOf<Core.ClassDictionary>().toEqualTypeOf<CVA.ClassDictionary>();
    expectTypeOf<Core.ClassArray>().toEqualTypeOf<CVA.ClassArray>();
    expectTypeOf<Core.AnyCX>().toEqualTypeOf<CVA.AnyCX>();
    expectTypeOf<Core.CXInput<typeof clsx>>().toEqualTypeOf<
      CVA.CXInput<typeof clsx>
    >();
    expectTypeOf<Core.VariantProps<typeof cva>>().toEqualTypeOf<
      CVA.VariantProps<typeof cva>
    >();
    expectTypeOf<Core.CX>().toEqualTypeOf<CVA.CX>();
    expectTypeOf<Core.CXOptions>().toEqualTypeOf<CVA.CXOptions>();
    expectTypeOf<Core.CXReturn>().toEqualTypeOf<CVA.CXReturn>();
    expectTypeOf<Core.CVAVariantShape>().toEqualTypeOf<CVA.CVAVariantShape>();
    expectTypeOf<Core.CVAComponent<unknown, unknown>>().toEqualTypeOf<
      CVA.CVAComponent<unknown, unknown>
    >();
    expectTypeOf<Core.CVAComponentShape>().toEqualTypeOf<CVA.CVAComponentShape>();
    expectTypeOf<Core.CVA>().toEqualTypeOf<CVA.CVA>();
    expectTypeOf<Core.DefineConfigOptions>().toEqualTypeOf<CVA.DefineConfigOptions>();
    expectTypeOf<Core.DefineConfig>().toEqualTypeOf<CVA.DefineConfig>();
    expectTypeOf<Core.GetSchema>().toEqualTypeOf<typeof getSchema>();
  });
});

describe("cva — runtime semantics", () => {
  const createRecordingConfig = () => {
    const calls: CVA.ClassValue[][] = [];
    const recording: CVA.CX = (...inputs) => {
      calls.push(inputs);
      return clsx(...inputs);
    };
    return { calls, ...defineConfig({ cx: recording }) };
  };

  describe("base and class argument streams", () => {
    test("an absent, null or empty config passes no arguments", () => {
      const { calls, cva: recordingCva } = createRecordingConfig();

      // @ts-expect-error — a config is required by the types
      expect(recordingCva()()).toBe("");
      // @ts-expect-error — `undefined` is not a config
      expect(recordingCva(undefined)()).toBe("");
      expect(
        recordingCva(
          // @ts-expect-error — `null` is not a config
          null,
        )(),
      ).toBe("");
      expect(recordingCva({})()).toBe("");

      expect(calls).toEqual([[], [], [], []]);
    });

    // The runtime call signature, without the authoring types' rule that
    // `class` and `className` are mutually exclusive; these rows stream both.
    type RuntimeCall = (props?: Record<string, unknown>) => string;

    test.each<
      [
        base: CVA.ClassValue,
        classValue: CVA.ClassValue,
        classNameValue: CVA.ClassValue,
        expectedArgs: CVA.ClassValue[],
      ]
    >([
      ["b", undefined, undefined, ["b"]],
      ["b", undefined, "c", ["b", "c"]],
      ["b", "c", undefined, ["b", "c"]],
      ["b", "c", "n", ["b", "c", "n"]],
      [undefined, undefined, "c", ["c"]],
      [undefined, undefined, undefined, []],
      ["b", null, undefined, ["b", null]],
      ["b", undefined, null, ["b", null]],
      ["b", null, null, ["b", null, null]],
      [null, undefined, undefined, [null]],
      [null, undefined, "c", [null, "c"]],
      [false, undefined, "c", [false, "c"]],
      [0, undefined, "c", [0, "c"]],
      ["", undefined, "c", ["", "c"]],
    ])(
      "base %p with class %p and className %p",
      (base, classValue, classNameValue, expectedArgs) => {
        const { calls, cva: recordingCva } = createRecordingConfig();
        const component = recordingCva({ base }) as RuntimeCall;

        component({ class: classValue, className: classNameValue });

        expect(calls).toEqual([expectedArgs]);
      },
    );

    test("props that are absent, null or a primitive stream the base alone", () => {
      const { calls, cva: recordingCva } = createRecordingConfig();
      const button = recordingCva({ base: "b" });

      button();
      // @ts-expect-error — `null` is not a props object
      button(null);
      // @ts-expect-error — a primitive is not a props object
      button("truthy");

      expect(calls).toEqual([["b"], ["b"], ["b"]]);
    });

    // Annotated because the authoring types accept `compoundVariants` only
    // alongside `variants`, which these shapes deliberately leave empty.
    type EmptyTableConfig = {
      base?: CVA.ClassValue;
      variants?: CVA.CVAVariantShape;
      compoundVariants?: { class?: string }[];
    };

    test.each<
      [
        configShape: EmptyTableConfig,
        props: Record<string, unknown> | undefined,
        expectedArgs: CVA.ClassValue[],
      ]
    >([
      [{ base: "b", variants: {} }, undefined, ["b"]],
      [{ base: "b", variants: {} }, { className: "c" }, ["b", "c"]],
      [{ base: "b", variants: {} }, { class: "c" }, ["b", "c"]],
      [{ variants: {} }, { className: "c" }, ["c"]],
      [{ base: "b", compoundVariants: [] }, undefined, ["b"]],
      [{ base: "b", compoundVariants: [] }, { className: "c" }, ["b", "c"]],
      [{ base: "b", compoundVariants: [] }, { class: "c" }, ["b", "c"]],
      [{ compoundVariants: [] }, { className: "c" }, ["c"]],
    ])(
      "an empty variant or compound table streams like %p with %p",
      (configShape, props, expectedArgs) => {
        const { calls, cva: recordingCva } = createRecordingConfig();
        const component = recordingCva(configShape) as RuntimeCall;

        component(props);

        expect(calls).toEqual([expectedArgs]);
      },
    );

    test("compound class then className, then the caller's class then className", () => {
      const { calls, cva: recordingCva } = createRecordingConfig();
      const compoundVariants: Record<string, unknown>[] = [
        {
          intent: "primary",
          class: "compound-class",
          className: "compound-className",
        },
      ];
      const button = recordingCva({
        base: "button",
        variants: { intent: { primary: "intent-primary" } },
        compoundVariants,
        defaultVariants: { intent: "primary" },
      });

      button({
        class: "caller-class",
        // @ts-expect-error — `class` and `className` are mutually exclusive
        className: "caller-className",
      });

      expect(calls[0]).toEqual([
        "button",
        "intent-primary",
        "compound-class",
        "compound-className",
        "caller-class",
        "caller-className",
      ]);
    });

    test("repeated calls stream the same base and variants", () => {
      const { calls, cva: recordingCva } = createRecordingConfig();
      const button = recordingCva({
        base: "button",
        variants: { intent: { primary: "intent-primary" } },
        defaultVariants: { intent: "primary" },
      });

      button();
      button({ class: "c" });
      button({ className: "n" });
      button({
        class: "c",
        // @ts-expect-error — `class` and `className` are mutually exclusive
        className: "n",
      });
      button();

      expect(calls).toEqual([
        ["button", "intent-primary"],
        ["button", "intent-primary", "c"],
        ["button", "intent-primary", "n"],
        ["button", "intent-primary", "c", "n"],
        ["button", "intent-primary"],
      ]);
    });

    test("a component with nothing to emit passes no arguments", () => {
      const { calls, cva: recordingCva } = createRecordingConfig();
      const button = recordingCva({
        variants: { intent: { primary: "intent-primary" } },
      });

      expect(button()).toBe("");
      expect(button({ className: "n" })).toBe("n");

      expect(calls).toEqual([[], ["n"]]);
    });

    test("a prop equal to its default streams the same as omitting it", () => {
      const { calls, cva: recordingCva } = createRecordingConfig();
      const button = recordingCva({
        base: "button",
        variants: { intent: { primary: "intent-primary" } },
        compoundVariants: [{ intent: "primary", class: "compound-primary" }],
        defaultVariants: { intent: "primary" },
      });

      button();
      button({ intent: "primary" });

      expect(calls).toEqual([
        ["button", "intent-primary", "compound-primary"],
        ["button", "intent-primary", "compound-primary"],
      ]);
    });
  });

  describe("compound variants", () => {
    const button = cva({
      base: "button",
      variants: {
        intent: {
          primary: "i-primary",
          secondary: "i-secondary",
          danger: "i-danger",
        },
        size: { small: "s-small", large: "s-large" },
      },
      compoundVariants: [
        { intent: "primary", class: "c-primary" },
        { intent: ["secondary", "danger"], class: "c-secondary-danger" },
        { intent: "danger", size: "large", class: "c-danger-large" },
        { class: "c-always" },
      ],
      defaultVariants: { intent: "primary", size: "small" },
    }) as CVA.CVAComponentShape;

    test.each<[props: Record<string, unknown> | undefined, expected: string]>([
      [undefined, "button i-primary s-small c-primary c-always"],
      [{ intent: "primary" }, "button i-primary s-small c-primary c-always"],
      [
        { intent: "secondary" },
        "button i-secondary s-small c-secondary-danger c-always",
      ],
      [
        { intent: "danger", size: "large" },
        "button i-danger s-large c-secondary-danger c-danger-large c-always",
      ],
      // The second selector decides once the first has matched.
      [
        { intent: "danger", size: "small" },
        "button i-danger s-small c-secondary-danger c-always",
      ],
      [{ intent: "unknown" }, "button s-small c-always"],
    ])("%p resolves to %p", (props, expected) => {
      expect(button(props)).toBe(expected);
    });

    test("a compound may select on a key no variant declares", () => {
      const banner = cva({
        base: "banner",
        variants: { intent: { primary: "intent-primary" } },
        compoundVariants: [{ tone: "loud", class: "compound-loud" }],
        defaultVariants: { intent: "primary" },
      }) as CVA.CVAComponentShape;

      expect(banner({ tone: "loud" })).toBe(
        "banner intent-primary compound-loud",
      );
      expect(banner()).toBe("banner intent-primary");
      expect(banner(Object.create({ tone: "loud" }))).toBe(
        "banner intent-primary",
      );
    });

    test("compounds resolve without any declared variants", () => {
      const banner = cva({
        base: "banner",
        compoundVariants: [{ tone: "loud", class: "compound-loud" }],
      }) as CVA.CVAComponentShape;

      expect(banner({ tone: "loud" })).toBe("banner compound-loud");
      expect(banner({ tone: "quiet" })).toBe("banner");
      expect(banner()).toBe("banner");
    });

    test("matches compounds across many variant keys", () => {
      const variants: CVA.CVAVariantShape = {};
      for (let index = 0; index < 33; index++) {
        variants[`k${index}`] = { on: `k${index}-on` };
      }
      const button = cva({
        variants,
        compoundVariants: [
          { k32: "on", class: "compound-last" },
          { class: "compound-always" },
        ],
      }) as CVA.CVAComponentShape;

      expect(button({ k32: "on" })).toBe(
        "k32-on compound-last compound-always",
      );
      expect(button({ k32: "off" })).toBe("compound-always");
      expect(button()).toBe("compound-always");
    });
  });

  describe("definition-time configuration", () => {
    test("no configuration property is read during a call", () => {
      const reads: string[] = [];
      const watched = <T>(key: string, value: T) => ({
        get: () => {
          reads.push(key);
          return value;
        },
        enumerable: true,
      });
      const config = Object.defineProperties(
        {},
        {
          base: watched("base", "button"),
          variants: watched("variants", {
            intent: { primary: "intent-primary" },
          }),
          compoundVariants: watched("compoundVariants", [
            { intent: "primary", class: "compound-primary" },
          ]),
          defaultVariants: watched("defaultVariants", { intent: "primary" }),
          composes: watched("composes", [cva({ base: "box" })]),
        },
      ) as {
        base: string;
        variants: { intent: { primary: string } };
        defaultVariants: { intent: "primary" };
      };
      const button = cva(config);

      expect(reads.length).toBeGreaterThan(0);
      reads.length = 0;

      expect(button()).toBe("box button intent-primary compound-primary");
      expect(button({ intent: "primary", className: "c" })).toBe(
        "box button intent-primary compound-primary c",
      );

      expect(reads).toEqual([]);
    });

    test("a frozen config is accepted", () => {
      // Freeze at runtime without widening to `Readonly`, which the authoring
      // types reject for `compoundVariants`.
      const frozen = <T>(value: T) => Object.freeze(value) as T;
      const config = frozen({
        base: "button",
        variants: frozen({ intent: frozen({ primary: "intent-primary" }) }),
        compoundVariants: frozen([
          frozen({ intent: "primary" as const, class: "compound-primary" }),
        ]),
        defaultVariants: frozen({ intent: "primary" as const }),
        composes: frozen([cva({ base: "box" })]),
      });

      expect(cva(config)()).toBe("box button intent-primary compound-primary");
    });

    test("nothing the caller authored is mutated or frozen", () => {
      const authored = {
        base: "button",
        variants: { intent: { primary: "intent-primary" } },
        compoundVariants: [
          { intent: "primary" as const, class: "compound-primary" },
        ],
        defaultVariants: { intent: "primary" as const },
        composes: [cva({ base: "box" })],
      };
      const snapshot = JSON.stringify(authored);
      const button = cva(authored);

      button();
      button({ intent: "primary", class: "c" });

      expect(JSON.stringify(authored)).toBe(snapshot);
      for (const value of [
        authored,
        authored.variants,
        authored.variants.intent,
        authored.compoundVariants,
        authored.compoundVariants[0],
        authored.defaultVariants,
        authored.composes,
      ]) {
        expect(Object.isFrozen(value)).toBe(false);
      }
      expect(Object.isFrozen(button.config)).toBe(false);
    });

    test("changed variants, defaults and compounds need recreation", () => {
      const config = {
        base: "button",
        variants: {
          intent: { primary: "intent-primary", secondary: "intent-secondary" },
        },
        compoundVariants: [
          {
            intent: "primary" as "primary" | "secondary",
            class: "compound-primary",
          },
        ],
        defaultVariants: { intent: "primary" as "primary" | "secondary" },
      };
      const button = cva(config);

      expect(button()).toBe("button intent-primary compound-primary");

      config.variants.intent.secondary = "intent-changed";
      config.compoundVariants = [
        { intent: "secondary", class: "compound-changed" },
      ];
      config.defaultVariants = { intent: "secondary" };

      expect(button()).toBe("button intent-primary compound-primary");
      expect(cva(config)()).toBe("button intent-changed compound-changed");
    });

    test("a replaced base needs recreation, through null and undefined", () => {
      const { calls, cva: recordingCva } = createRecordingConfig();
      const config = {
        base: "button" as CVA.ClassValue,
        variants: {
          intent: { primary: "intent-primary", secondary: "intent-changed" },
        },
        compoundVariants: [
          {
            intent: "primary" as "primary" | "secondary",
            class: "compound-primary",
          },
        ],
        defaultVariants: { intent: "primary" as "primary" | "secondary" },
      };
      const button = recordingCva(config);

      config.compoundVariants = [
        { intent: "secondary", class: "compound-changed" },
      ];
      config.defaultVariants = { intent: "secondary" };
      config.base = null;
      button();
      const withNull = recordingCva(config);
      config.base = undefined;
      button();
      const withUndefined = recordingCva(config);
      withNull();
      withUndefined();

      expect(calls).toEqual([
        ["button", "intent-primary", "compound-primary"],
        ["button", "intent-primary", "compound-primary"],
        [null, "intent-changed", "compound-changed"],
        ["intent-changed", "compound-changed"],
      ]);
    });

    test("a child added to the authored composes array needs the parent recreated", () => {
      const box = cva({ base: "box" });
      const stack = cva({ base: "stack" });
      const composes = [box];
      const card = cva({ composes, base: "card" });

      expect(card()).toBe("box card");

      composes.push(stack);

      expect(card()).toBe("box card");
      expect(cva({ composes, base: "card" })()).toBe("box stack card");
    });

    test("a parent reads each child's config when the parent is created", () => {
      const child = cva({
        variants: {
          intent: { primary: "child-primary", secondary: "child-secondary" },
        },
        defaultVariants: { intent: "primary" as "primary" | "secondary" },
      });
      const card = cva({ composes: [child], base: "card" });

      expect(card()).toBe("child-primary card");

      child.config.defaultVariants = { intent: "secondary" };

      // Neither re-reads it: each read the config it was created with.
      expect(child()).toBe("child-primary");
      expect(card()).toBe("child-primary card");

      expect(cva({ composes: [child], base: "card" })()).toBe(
        "child-secondary card",
      );
    });

    test("known props are read up front, before any composed child runs", () => {
      let reads = 0;
      let readsWhenChildRan = -1;
      const props = {
        get v(): "a" | "b" {
          reads++;
          return "a";
        },
      };
      const child = Object.assign(
        () => {
          readsWhenChildRan = reads;
          // Reaching back into the caller's props object cannot change the
          // parent's output: every key it knows was already read.
          Object.defineProperty(props, "v", {
            value: "b",
            enumerable: true,
            configurable: true,
          });
          return "child";
        },
        { config: {} },
      ) as CVA.CVAComponentShape;
      const card = cva({
        composes: [child],
        variants: { v: { a: "variant-a", b: "variant-b" } },
      });

      expect(card(props)).toBe("child variant-a");
      // Once to resolve the variant, once to build the child's own props.
      expect(readsWhenChildRan).toBe(2);
      expect(reads).toBe(2);
    });

    test("a known prop is read once on a call with no composed children", () => {
      let reads = 0;
      const button = cva({ variants: { v: { a: "variant-a" } } });

      expect(
        button({
          get v(): "a" {
            reads++;
            return "a";
          },
        }),
      ).toBe("variant-a");
      expect(reads).toBe(1);
    });
  });

  describe("own enumerable keys only", () => {
    test("inherited variant keys contribute neither a class nor a schema entry", () => {
      const variants: { size: { sm: string } } = Object.create({
        intent: { primary: "intent-primary" },
      });
      variants.size = { sm: "size-sm" };

      const button = cva({ variants, defaultVariants: { size: "sm" } });

      expect(
        button({
          // @ts-expect-error — the inherited key is not part of the surface
          intent: "primary",
        }),
      ).toBe("size-sm");
      expect(button.config.variants).toStrictEqual({ size: { sm: "size-sm" } });
      expect(getSchema(button)).toStrictEqual({
        size: { values: ["sm"], defaultValue: "sm" },
      });
    });

    test("inherited keys on a compound variant object are ignored, unread", () => {
      const compound: Record<string, unknown> = Object.create({
        get unrelated(): never {
          throw new Error("an inherited compound key was read");
        },
      });
      compound.intent = "primary";
      compound.class = "compound-primary";
      const compoundVariants: Record<string, unknown>[] = [compound];

      const button = cva({
        base: "button",
        variants: { intent: { primary: "intent-primary" } },
        compoundVariants,
        defaultVariants: { intent: "primary" },
      });

      expect(button()).toBe("button intent-primary compound-primary");
    });

    test("compound matching ignores inherited and non-enumerable props, variant resolution does not", () => {
      const button = cva({
        base: "button",
        variants: {
          intent: { primary: "intent-primary", secondary: "intent-secondary" },
        },
        compoundVariants: [{ intent: "primary", class: "compound-primary" }],
        defaultVariants: { intent: "secondary" },
      });

      const inherited: { intent?: "primary" } = Object.create({
        intent: "primary",
      });
      const hidden: { intent?: "primary" } = {};
      Object.defineProperty(hidden, "intent", {
        value: "primary",
        enumerable: false,
      });

      // A plain `props[key]` read resolves the variant through either, but
      // neither reaches compound matching, which sees own enumerable keys only.
      expect(button(inherited)).toBe("button intent-primary");
      expect(button(hidden)).toBe("button intent-primary");
      expect(button({ intent: "primary" })).toBe(
        "button intent-primary compound-primary",
      );
    });

    test("inherited props are dropped before reaching a composed child", () => {
      const seen: (string | undefined)[] = [];
      const child = Object.assign(
        (props?: Record<string, unknown>) => {
          seen.push(props && (props.intent as string | undefined));
          return "child";
        },
        { config: {} },
      ) as CVA.CVAComponentShape;
      const card = cva({ composes: [child], base: "card" });

      expect(card(Object.create({ intent: "inherited" }))).toBe("child card");

      expect(seen).toEqual([undefined]);
    });
  });

  describe("prototype safety", () => {
    const createProtoProps = () =>
      JSON.parse('{"__proto__": {"polluted": "yes"}}');

    test("an own __proto__ key in defaultVariants stays a data property", () => {
      const child = cva({
        base: "child",
        variants: { intent: { primary: "intent-primary" } },
        defaultVariants: createProtoProps(),
      });
      const parent = cva({ composes: [child], base: "parent" });
      const { defaultVariants } = parent.config;

      expect(Object.getPrototypeOf(defaultVariants)).toBe(Object.prototype);
      expect(Object.hasOwnProperty.call(defaultVariants, "__proto__")).toBe(
        true,
      );
      expect({}).not.toHaveProperty("polluted");
      expect(parent()).toBe("child parent");
    });

    // A typed-but-degenerate input the merge keeps as an own data property.
    test("an own __proto__ variant key stays a data property when merged", () => {
      const child = Object.assign(() => "child", {
        config: { variants: { ["__proto__"]: { a: "proto-a" } } },
      });
      const card = cva({ composes: [child], variants: { v: { a: "v-a" } } });
      const { variants } = card.config;

      expect(Object.getPrototypeOf(variants)).toBe(Object.prototype);
      expect(Object.hasOwnProperty.call(variants, "__proto__")).toBe(true);
      expect(variants["__proto__"]).toStrictEqual({ a: "proto-a" });
      expect({}).not.toHaveProperty("a");
    });

    test("an own __proto__ key in props stays a data property", () => {
      const seen: Record<string, unknown>[] = [];
      const child = Object.assign(
        (props?: Record<string, unknown>) => {
          seen.push(props as Record<string, unknown>);
          return "child";
        },
        { config: {} },
      );
      const parent = cva({ composes: [child], base: "parent" });

      expect(parent(createProtoProps())).toBe("child parent");
      expect(Object.getPrototypeOf(seen[0])).toBe(Object.prototype);
      expect(Object.hasOwnProperty.call(seen[0], "__proto__")).toBe(true);
      expect({}).not.toHaveProperty("polluted");
    });
  });

  describe("composition", () => {
    // Use a regular function to observe `this`. In this ES module,
    // a detached call receives `undefined`.
    const createReceiverRecorder = () => {
      const seen: unknown[] = [];
      const child = Object.assign(
        function (this: unknown) {
          seen.push(this);
          return "child";
        },
        { config: {} },
      );
      return { child, seen };
    };

    test("an explicit undefined prop falls back to the composed default", () => {
      const box = cva({
        variants: { pad: { sm: "p-1", lg: "p-4" } },
        defaultVariants: { pad: "sm" },
      });
      const card = cva({ composes: box, base: "card" });

      expect(card({ pad: undefined })).toBe("p-1 card");
      expect(card({ pad: "lg" })).toBe("p-4 card");
    });

    test("detaches composed child calls", () => {
      const composed = createReceiverRecorder();

      expect(cva({ composes: [composed.child], base: "card" })()).toBe(
        "child card",
      );

      expect(composed.seen).toStrictEqual([undefined]);
    });

    test("each composed child receives its own props object", () => {
      const vandal = Object.assign(
        (props?: Record<string, unknown>) => {
          (props as Record<string, unknown>).intent = "primary";
          return "vandal";
        },
        { config: {} },
      );
      const sibling = cva({
        base: "sibling",
        variants: {
          intent: { primary: "intent-primary", secondary: "intent-secondary" },
        },
        defaultVariants: { intent: "secondary" },
      });
      const card = cva({
        composes: [vandal, sibling],
        compoundVariants: [{ intent: "primary", class: "compound-leaked" }],
      });

      expect(card()).toBe("vandal sibling intent-secondary");
    });

    test("component.config exposes fresh merged objects, not the authored ones", () => {
      const variants = { intent: { primary: "intent-primary" } };
      const defaultVariants = { intent: "primary" as const };
      const button = cva({ variants, defaultVariants });

      expect(button.config.variants).not.toBe(variants);
      expect(button.config.variants).toStrictEqual(variants);
      expect(button.config.defaultVariants).not.toBe(defaultVariants);
      expect(button.config.defaultVariants).toStrictEqual(defaultVariants);
    });

    test("composes: null behaves as no composition", () => {
      // @ts-expect-error — `null` is not part of the `composes` surface
      const solo = cva({ composes: null, base: "solo" });

      expect(solo()).toBe("solo");
    });
  });

  describe("the concatenator receiver", () => {
    test("a later reassignment of options.cx is honoured per call", () => {
      const options: { cx: CVA.CX } = { cx: clsx };
      const { cva: liveCva, cx: liveCx } = defineConfig(options);
      const button = liveCva({ base: "button" });

      expect(liveCx("x")).toBe("x");
      expect(button()).toBe("button");

      options.cx = (...inputs) => `<${clsx(...inputs)}>`;
      expect(liveCx("x")).toBe("<x>");
      expect(button()).toBe("<button>");
      expect(button({ className: "c" })).toBe("<button c>");
    });

    test("calls the concatenator with options as its receiver", () => {
      const options = {
        marker: "self",
        cx(this: { marker: string }, ...inputs: CVA.ClassValue[]) {
          return `${this.marker}:${clsx(...inputs)}`;
        },
      };
      const { cva: selfCva, cx: selfCx } = defineConfig(options);

      const button = selfCva({ base: "x" });

      expect(selfCx("a", undefined, "b")).toBe("self:a b");
      expect(button()).toBe("self:x");
      expect(button({ class: "y" })).toBe("self:x y");
      expect(button({ className: "y" })).toBe("self:x y");
      expect(
        selfCva({
          base: "x",
          variants: { v: { a: "variant-a" } },
        })({ v: "a" }),
      ).toBe("self:x variant-a");
    });
  });
});

describe("cva — authoring types", () => {
  const button = cva({
    base: "button",
    variants: {
      intent: { primary: "primary", secondary: "secondary" },
      size: { sm: "sm", lg: "lg" },
      _internal: { on: "on", off: "off" },
    },
    defaultVariants: { intent: "primary" },
  });

  test("a props interface can extend `VariantProps` directly", () => {
    // The shadcn idiom: `VariantProps` must stay an object type an
    // interface can extend (TS2312).
    interface ButtonProps extends CVA.VariantProps<typeof button> {}

    expectTypeOf<keyof ButtonProps>().toEqualTypeOf<
      keyof CVA.VariantProps<typeof button>
    >();
    expectTypeOf<keyof ButtonProps>().toEqualTypeOf<"intent" | "size">();
  });

  test("`VariantProps` omits the class props and internal variants", () => {
    expectTypeOf<CVA.VariantProps<typeof button>>().toEqualTypeOf<{
      intent?: "primary" | "secondary" | undefined;
      size?: "sm" | "lg" | undefined;
    }>();

    // The component itself still accepts them.
    expect(button({ _internal: "on", size: "sm", class: "extra" })).toBe(
      "button primary sm on extra",
    );
  });

  test("`__proto__` is rejected as a variant name", () => {
    // @ts-expect-error — `__proto__` is not an authorable variant name
    cva({ variants: { __proto__: { on: "on" } } });
    // @ts-expect-error — and a computed key doesn't get around it
    cva({ variants: { ["__proto__"]: { on: "on" } } });
  });

  test("variants typed as a broad record are still accepted", () => {
    // Widening hides the key from the guard.
    const variants: Record<string, Record<string, string>> = {
      ["__proto__"]: { on: "on" },
      intent: { primary: "primary" },
    };
    const dynamic = cva({ base: "button", variants });

    expect(dynamic({ intent: "primary" })).toBe("button primary");
  });
});
