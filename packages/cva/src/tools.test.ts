import type * as CVATools from "./tools";
import { getSchema, pva } from "./tools";
import { compose, cva } from "./";

describe("getSchema", () => {
  test("should return the schema for a component", () => {
    const buttonWithoutBaseWithDefaultsString = cva({
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
        empty: {},
        disabled: {
          true: "button--disabled opacity-050 cursor-not-allowed",
          false: "button--enabled cursor-pointer",
        },
        size: {
          small: "button--small text-sm py-1 px-2",
          medium: "button--medium text-base py-2 px-4",
          large: "button--large text-lg py-2.5 px-4",
        },
        m: {
          0: "m-0",
          1: "m-1",
        },
      },
      compoundVariants: [
        {
          intent: "primary",
          size: "medium",
          class: "button--primary-medium uppercase",
        },
        {
          intent: "warning",
          disabled: false,
          class: "button--warning-enabled text-gray-800",
        },
        {
          intent: "warning",
          disabled: true,
          class: [
            "button--warning-disabled",
            [1 && "text-black", { baz: false, bat: null }],
          ],
        },
        {
          intent: ["warning", "danger"],
          class: "button--warning-danger !border-red-500",
        },
        {
          intent: ["warning", "danger"],
          size: "medium",
          class: "button--warning-danger-medium",
        },
      ],
      defaultVariants: {
        disabled: false,
        intent: "primary",
        size: "medium",
      },
    });

    const schema = getSchema(buttonWithoutBaseWithDefaultsString);

    expect(schema).toStrictEqual({
      disabled: {
        values: [true, false],
        defaultValue: false,
      },
      intent: {
        values: ["unset", "primary", "secondary", "warning", "danger"],
        defaultValue: "primary",
      },
      m: {
        values: [0, 1],
      },
      size: {
        values: ["small", "medium", "large"],
        defaultValue: "medium",
      },
    });

    expectTypeOf(schema).toEqualTypeOf<{
      intent: {
        values: readonly (
          | "warning"
          | "unset"
          | "primary"
          | "secondary"
          | "danger"
        )[];
        defaultValue: "primary";
      };
      disabled: {
        values: readonly boolean[];
        defaultValue: false;
      };
      size: {
        values: readonly ("small" | "medium" | "large")[];
        defaultValue: "medium";
      };
      m: {
        values: readonly (0 | 1)[];
      };
    }>();
  });

  test("should return the schema for a composed component", () => {
    const box = cva({
      variants: {
        shadow: {
          sm: "shadow-sm",
          md: "shadow-md",
        },
      },
      defaultVariants: {
        shadow: "sm",
      },
    });

    const stack = cva({
      variants: {
        gap: {
          unset: null,
          1: "gap-1",
          2: "gap-2",
          3: "gap-3",
        },
      },
      defaultVariants: {
        gap: "unset",
      },
    });

    const single = cva({ composes: box });
    expect(getSchema(single)).toStrictEqual({
      shadow: { values: ["sm", "md"], defaultValue: "sm" },
    });

    const card = cva({ composes: [box, stack] });
    const schema = getSchema(card);

    expect(schema).toStrictEqual({
      shadow: { values: ["sm", "md"], defaultValue: "sm" },
      gap: { values: [1, 2, 3, "unset"], defaultValue: "unset" },
    });

    expectTypeOf(schema).toEqualTypeOf<{
      shadow: { values: readonly ("sm" | "md")[]; defaultValue: "sm" };
      gap: { values: readonly ("unset" | 1 | 2 | 3)[]; defaultValue: "unset" };
    }>();
  });

  test("should reject components not created by cva()", () => {
    const box = cva({
      variants: { shadow: { sm: "shadow-sm" } },
    });
    const stack = cva({
      variants: { gap: { 1: "gap-1" } },
    });
    const composed = compose(box, stack);
    const plainFunction = () => "";

    // @ts-expect-error — `compose()`'s result has no `.config`, so it can't
    // be introspected by `getSchema`. Use the `composes` property instead.
    getSchema(composed);
    // @ts-expect-error — not a cva()-created component at all
    getSchema(plainFunction);
  });

  test("should normalize numeric variant keys, including negatives", () => {
    const component = cva({
      variants: {
        offset: {
          [-1]: "-mt-1",
          0: "mt-0",
          1: "mt-1",
        },
      },
      defaultVariants: { offset: -1 },
    });

    const schema = getSchema(component);

    // Runtime values match the variant prop types (`-1 | 0 | 1`), not the
    // stringified object keys they were read from. Order follows `Object.keys`:
    // array-index keys (`0`, `1`) ascending first, then other keys (`-1`) by
    // insertion order.
    expect(schema).toStrictEqual({
      offset: { values: [0, 1, -1], defaultValue: -1 },
    });
    expectTypeOf(schema).toEqualTypeOf<{
      offset: { values: readonly (0 | 1 | -1)[]; defaultValue: -1 };
    }>();
  });
});

describe("pva", () => {
  test("should combine the class string and data attributes from one props object", () => {
    const button = cva({
      base: "button",
      variants: {
        intent: {
          primary: "button--primary",
          secondary: "button--secondary",
        },
        size: {
          small: "button--small",
          medium: "button--medium",
        },
        disabled: {
          true: "button--disabled",
          false: "button--enabled",
        },
      },
      defaultVariants: {
        intent: "primary",
        disabled: false,
      },
    });

    const props = { intent: "secondary" as const, size: "medium" as const };
    const result = pva(button, props);

    // `class` and `className` carry the identical string, matching a direct
    // call to the component itself.
    expect(result.class).toBe(button(props));
    expect(result.className).toBe(button(props));
    expect(result.data).toStrictEqual({
      "data-intent": "secondary",
      "data-size": "medium",
      "data-disabled": "false",
    });

    expectTypeOf(result).toEqualTypeOf<{
      class: string;
      className: string;
      data: {
        "data-intent"?: "primary" | "secondary";
        "data-size"?: "small" | "medium";
        "data-disabled"?: "true" | "false";
      };
    }>();
  });

  test("should resolve .data props against defaults like class resolution", () => {
    const button = cva({
      base: "button",
      variants: {
        intent: {
          primary: "button--primary",
          secondary: "button--secondary",
        },
        size: {
          small: "button--small",
          medium: "button--medium",
        },
        disabled: {
          true: "button--disabled",
          false: "button--enabled",
        },
      },
      defaultVariants: {
        intent: "primary",
        disabled: false,
      },
    });

    // No props: defaults fill in; `size` has no default, so no attribute.
    expect(pva(button).data).toStrictEqual({
      "data-intent": "primary",
      "data-disabled": "false",
    });

    // Props override defaults; an explicit `undefined` falls back to the
    // default, exactly like the component call.
    expect(
      pva(button, {
        intent: "secondary",
        size: "medium",
        disabled: undefined,
      }).data,
    ).toStrictEqual({
      "data-intent": "secondary",
      "data-size": "medium",
      "data-disabled": "false",
    });

    // Boolean variants stringify in both states.
    expect(pva(button, { disabled: true }).data).toStrictEqual({
      "data-intent": "primary",
      "data-disabled": "true",
    });

    // @ts-expect-error — `"huge"` is not a `size` value
    pva(button, { size: "huge" });
  });

  test("should merge class/className props into the class string only", () => {
    const button = cva({
      base: "button",
      variants: {
        intent: { primary: "button--primary", secondary: "button--secondary" },
      },
      defaultVariants: { intent: "primary" },
    });

    const result = pva(button, { intent: "secondary", class: "extra" });

    expect(result.class).toBe("button button--secondary extra");
    expect(result.className).toBe("button button--secondary extra");
    // `class` never leaks into `data` — it's a class input, not a variant.
    expect(result.data).toStrictEqual({ "data-intent": "secondary" });
  });

  test("should stringify numeric .data variant values, including negatives", () => {
    const component = cva({
      variants: {
        offset: {
          [-1]: "-mt-1",
          0: "mt-0",
          1: "mt-1",
        },
      },
      defaultVariants: { offset: 0 },
    });

    expect(pva(component).data).toStrictEqual({ "data-offset": "0" });
    expect(pva(component, { offset: -1 }).data).toStrictEqual({
      "data-offset": "-1",
    });
  });

  test("should kebab-case camelCase variant names in .data", () => {
    const button = cva({
      variants: {
        iconPosition: {
          left: "button--icon-left",
          right: "button--icon-right",
        },
      },
      defaultVariants: { iconPosition: "left" },
    });

    const data = pva(button).data;

    // Kebab-cased so the attribute round-trips through the DOM's camelCase
    // `dataset` API (`dataset.iconPosition` ↔ `data-icon-position`).
    expect(data).toStrictEqual({ "data-icon-position": "left" });
    expectTypeOf(data).toEqualTypeOf<{
      "data-icon-position"?: "left" | "right";
    }>();
  });

  test("should omit .data variants that resolve to no value", () => {
    const box = cva({ base: "box" });
    // @ts-expect-error — a variant-less component has nothing to introspect,
    // so the type guard rejects it (matching `getSchema`); the runtime
    // degrades to an empty object.
    expect(pva(box).data).toStrictEqual({});

    const withEmpty = cva({
      variants: {
        intent: { primary: "intent--primary" },
        empty: {},
      },
    });
    // `intent` has no default and no prop; `empty` can never resolve.
    expect(pva(withEmpty).data).toStrictEqual({});
    expect(pva(withEmpty, { intent: "primary" }).data).toStrictEqual({
      "data-intent": "primary",
    });
  });

  test("should resolve merged variants for composed components", () => {
    const box = cva({
      variants: { shadow: { sm: "shadow-sm", md: "shadow-md" } },
      defaultVariants: { shadow: "sm" },
    });
    const stack = cva({
      variants: { gap: { unset: null, 1: "gap-1", 2: "gap-2" } },
      defaultVariants: { gap: "unset" },
    });
    // Composed variants and their defaults are merged into `config` at
    // construction, so they resolve here exactly like local ones.
    const card = cva({ composes: [box, stack] });

    expect(pva(card).data).toStrictEqual({
      "data-shadow": "sm",
      "data-gap": "unset",
    });

    const result = pva(card, { shadow: "md", gap: 2 });
    expect(result.class).toBe(card({ shadow: "md", gap: 2 }));
    expect(result.data).toStrictEqual({
      "data-shadow": "md",
      "data-gap": "2",
    });
  });

  test("should stay consistent across repeated calls and components", () => {
    const a = cva({
      variants: { tone: { light: "tone--light" } },
      defaultVariants: { tone: "light" },
    });
    const b = cva({
      variants: { tone: { dark: "tone--dark" } },
    });

    // Repeated calls (cached precompute) and interleaved components must not
    // bleed into each other.
    const first = pva(a).data;
    expect(pva(a).data).toStrictEqual(first);
    expect(pva(b).data).toStrictEqual({});
    expect(pva(b, { tone: "dark" }).data).toStrictEqual({
      "data-tone": "dark",
    });
    expect(pva(a, { tone: "light" }).data).toStrictEqual({
      "data-tone": "light",
    });
  });

  describe("class-resolution parity", () => {
    // `.data` must always report exactly the variant key class resolution
    // selected — both sides share `falsyToString`'s fallback semantics
    // (see the lockstep comments in `tools.ts` and `index.ts`).
    const button = cva({
      base: "button",
      variants: {
        intent: {
          primary: "button--primary",
          secondary: "button--secondary",
        },
      },
      defaultVariants: { intent: "primary" },
    });

    test("null and empty-string props fall back to the default, like the class string", () => {
      // Both are rejected by the types, so this is JS-consumer territory —
      // but both are falsy through `falsyToString`, so class resolution
      // falls back to the default and `.data` must agree with the classes
      // actually rendered.

      // @ts-expect-error — `null` is not a valid `intent` value
      const nullProp = pva(button, { intent: null });
      expect(nullProp.class).toBe("button button--primary");
      expect(nullProp.data).toStrictEqual({ "data-intent": "primary" });

      // @ts-expect-error — `""` is not a valid `intent` value
      const emptyProp = pva(button, { intent: "" });
      expect(emptyProp.class).toBe("button button--primary");
      expect(emptyProp.data).toStrictEqual({ "data-intent": "primary" });
    });

    test("false, zero, and negative values resolve as themselves", () => {
      const toggle = cva({
        variants: {
          pressed: { true: "t", false: "f" },
          offset: { [-1]: "-mt-1", 0: "mt-0", 1: "mt-1" },
        },
        defaultVariants: { pressed: true, offset: 1 },
      });

      // `false` and `0` are falsy values with meaning — `falsyToString`
      // stringifies them before the fallback check, so they must never
      // fall through to the defaults.
      const result = pva(toggle, { pressed: false, offset: 0 });
      expect(result.class).toBe("f mt-0");
      expect(result.data).toStrictEqual({
        "data-pressed": "false",
        "data-offset": "0",
      });
      expect(pva(toggle, { offset: -1 }).data).toStrictEqual({
        "data-pressed": "true",
        "data-offset": "-1",
      });
    });

    test("an own __proto__ key in untyped props never leaks an attribute", () => {
      // JSON-sourced props can carry an own `__proto__` key; the cached
      // lookup table has a null prototype, so the key can't accidentally
      // resolve to `Object.prototype` and emit a junk attribute.
      const props = JSON.parse(
        '{ "__proto__": { "polluted": true }, "intent": "secondary" }',
      );
      expect(pva(button, props).data).toStrictEqual({
        "data-intent": "secondary",
      });
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  test("should kebab-case a leading uppercase letter into a double dash", () => {
    const card = cva({
      variants: { Tone: { dark: "tone--dark", light: "tone--light" } },
      defaultVariants: { Tone: "dark" },
    });

    // `data--tone` looks odd but is the spec-correct `dataset` encoding of
    // a capitalized name: `dataset.Tone` reads and writes `data--tone`.
    const data = pva(card).data;
    expect(data).toStrictEqual({ "data--tone": "dark" });
    expectTypeOf(data).toEqualTypeOf<{ "data--tone"?: "dark" | "light" }>();
  });

  test("should reject components not created by cva()", () => {
    const box = cva({
      variants: { shadow: { sm: "shadow-sm" } },
    });
    const stack = cva({
      variants: { gap: { 1: "gap-1" } },
    });
    const composed = compose(box, stack);
    const plainFunction = () => "";

    // @ts-expect-error — `compose()`'s result has no `.config`, so it can't
    // be introspected by `pva`. Use the `composes` property instead.
    pva(composed);
    // @ts-expect-error — not a cva()-created component at all
    pva(plainFunction);
  });
});

describe("exported types", () => {
  test("tool types stay exported", () => {
    // Each name below must be reachable through the `CVATools.` namespace
    // import, or this fails to compile. See AGENTS.md Learnings.
    expectTypeOf<CVATools.GetSchema>().not.toBeNever();
    expectTypeOf<CVATools.PVA>().not.toBeNever();
  });
});
