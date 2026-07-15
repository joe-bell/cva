import type * as CVA from "./";
import { compose, cva, cx, defineConfig, getSchema } from "./";

describe("cx", () => {
  describe.each<CVA.CXOptions>([
    [null, ""],
    [undefined, ""],
    [false && "foo", ""],
    [true && "foo", "foo"],
    [["foo", undefined, "bar", undefined, "baz"], "foo bar baz"],
    [
      [
        "foo",
        [
          undefined,
          ["bar"],
          [
            undefined,
            [
              "baz",
              "qux",
              "quux",
              "quuz",
              [[[[[[[[["corge", "grault"]]]]], "garply"]]]],
            ],
          ],
        ],
      ],
      "foo bar baz qux quux quuz corge grault garply",
      [
        [
          "foo",
          [1 && "bar", { baz: false, bat: null }, ["hello", ["world"]]],
          "cya",
        ],
        "foo bar hello world cya",
      ],
    ],
  ])("cx(%o)", (options, expected) => {
    test(`returns ${expected}`, () => {
      expect(cx(options)).toBe(expected);
    });
  });
});

describe("compose", () => {
  test("should merge into a single component", () => {
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

    const card = compose(box, stack);

    expectTypeOf(card).toBeFunction();

    expectTypeOf(card).parameter(0).toMatchTypeOf<
      | {
          shadow?: "sm" | "md" | undefined;
          gap?: "unset" | 1 | 2 | 3 | undefined;
        }
      | undefined
    >();

    expect(card()).toBe("shadow-sm");
    expect(card({ class: "adhoc-class" })).toBe("shadow-sm adhoc-class");
    expect(card({ className: "adhoc-class" })).toBe("shadow-sm adhoc-class");
    expect(card({ shadow: "md" })).toBe("shadow-md");
    expect(card({ gap: 2 })).toBe("shadow-sm gap-2");
    expect(card({ shadow: "md", gap: 3, class: "adhoc-class" })).toBe(
      "shadow-md gap-3 adhoc-class",
    );
    expect(
      card({
        shadow: "md",
        gap: 3,
        className: "adhoc-class",
      }),
    ).toBe("shadow-md gap-3 adhoc-class");
  });

  test("should accept internal variant props", () => {
    const base = cva({
      variants: {
        _tone: {
          quiet: "tone-quiet",
          loud: "tone-loud",
        },
      },
      defaultVariants: { _tone: "quiet" },
    });

    const stack = cva({
      variants: {
        gap: {
          1: "gap-1",
          2: "gap-2",
        },
      },
      defaultVariants: { gap: 1 },
    });

    const card = compose(base, stack);

    expectTypeOf(card).parameter(0).toMatchTypeOf<
      | {
          _tone?: "quiet" | "loud" | undefined;
          gap?: 1 | 2 | undefined;
        }
      | undefined
    >();
  });
});

describe("cva — composes", () => {
  test("should support a single component", () => {
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

    const card = cva({ composes: box });

    expectTypeOf(card).toBeFunction();
    expectTypeOf(card).parameter(0).toMatchTypeOf<
      | {
          shadow?: "sm" | "md" | undefined;
        }
      | undefined
    >();

    expect(card()).toBe("shadow-sm");
    expect(card({ class: "adhoc-class" })).toBe("shadow-sm adhoc-class");
    expect(card({ className: "adhoc-class" })).toBe("shadow-sm adhoc-class");
    expect(card({ shadow: "md" })).toBe("shadow-md");
  });

  test("should merge into a single component", () => {
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

    const card = cva({ composes: [box, stack] });

    expectTypeOf(card).toBeFunction();
    expectTypeOf(card).parameter(0).toMatchTypeOf<
      | {
          shadow?: "sm" | "md" | undefined;
          gap?: "unset" | 1 | 2 | 3 | undefined;
        }
      | undefined
    >();

    expect(card()).toBe("shadow-sm");
    expect(card({ class: "adhoc-class" })).toBe("shadow-sm adhoc-class");
    expect(card({ className: "adhoc-class" })).toBe("shadow-sm adhoc-class");
    expect(card({ shadow: "md" })).toBe("shadow-md");
    expect(card({ gap: 2 })).toBe("shadow-sm gap-2");
    expect(card({ shadow: "md", gap: 3, class: "adhoc-class" })).toBe(
      "shadow-md gap-3 adhoc-class",
    );
    expect(card({ shadow: "md", gap: 3, className: "adhoc-class" })).toBe(
      "shadow-md gap-3 adhoc-class",
    );
  });

  test("should support additional variants alongside composes", () => {
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

    const card = cva({
      composes: [box, stack],
      variants: {
        rounded: { sm: "rounded-sm", lg: "rounded-lg" },
      },
      defaultVariants: { rounded: "sm" },
    });

    expectTypeOf(card).parameter(0).toMatchTypeOf<
      | {
          shadow?: "sm" | "md" | undefined;
          gap?: "unset" | 1 | 2 | 3 | undefined;
          rounded?: "sm" | "lg" | undefined;
        }
      | undefined
    >();

    expect(card()).toBe("shadow-sm rounded-sm");
    expect(card({ rounded: "lg" })).toBe("shadow-sm rounded-lg");
    expect(card({ shadow: "md", gap: 2, rounded: "lg" })).toBe(
      "shadow-md gap-2 rounded-lg",
    );
  });

  // https://github.com/joe-bell/cva/issues/256
  //
  // `composes: [a, b, c]` used to infer `(a | c)[]` rather than a tuple: `b`
  // was silently dropped by TS's union-subtype reduction whenever its
  // variants were a structural superset of `a`'s (exactly this shape), so
  // `"secondary"` disappeared from both the props type and `getSchema`.
  test("should union overlapping variant values across composed components (#256)", () => {
    const a = cva({
      base: "a",
      variants: { style: { primary: "a-primary" } },
    });
    const b = cva({
      base: "b",
      variants: { style: { primary: "b-primary", secondary: "b-secondary" } },
    });
    const c = cva({
      base: "c",
      variants: { style: { tertiary: "c-tertiary" } },
    });

    const combined = cva({ composes: [a, b, c] });

    expectTypeOf<CVA.VariantProps<typeof combined>>().toEqualTypeOf<{
      style?: "primary" | "secondary" | "tertiary" | undefined;
    }>();

    // Each composed component still resolves its own class independently —
    // overlapping values extend, they never override one another.
    expect(combined({ style: "primary" })).toBe("a a-primary b b-primary c");
    expect(combined({ style: "secondary" })).toBe("a b b-secondary c");
    expect(combined({ style: "tertiary" })).toBe("a b c c-tertiary");

    const schema = getSchema(combined);
    expect(schema).toStrictEqual({
      style: { values: ["primary", "secondary", "tertiary"] },
    });
    expectTypeOf(schema).toEqualTypeOf<{
      style: { values: readonly ("primary" | "secondary" | "tertiary")[] };
    }>();

    // @ts-expect-error — no composed component declares `style: "quaternary"`
    combined({ style: "quaternary" });
  });

  test("should propagate merged (last-wins) defaults to every composed component", () => {
    const a = cva({ base: "a", variants: { style: { primary: "a-primary" } } });
    const b = cva({
      base: "b",
      variants: { style: { primary: "b-primary", secondary: "b-secondary" } },
      defaultVariants: { style: "primary" },
    });
    const c = cva({
      base: "c",
      variants: { style: { tertiary: "c-tertiary" } },
      defaultVariants: { style: "tertiary" },
    });

    const combined = cva({ composes: [a, b, c] });

    // With no props, the merged default (`"tertiary"`, from the last
    // composed component) is propagated to every composed component — not
    // just `c` — so the runtime output matches `getSchema`'s `defaultValue`.
    expect(combined()).toBe("a b c c-tertiary");
    expect(combined({ style: "tertiary" })).toBe("a b c c-tertiary");

    // Explicit props still take precedence over the merged default.
    expect(combined({ style: "primary" })).toBe("a a-primary b b-primary c");

    expect(getSchema(combined)).toStrictEqual({
      style: {
        values: ["primary", "secondary", "tertiary"],
        defaultValue: "tertiary",
      },
    });
  });

  test("should extend, not replace, a composed variant redeclared locally", () => {
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

    const card = cva({
      composes: box,
      variants: {
        shadow: { lg: "shadow-lg" },
      },
    });

    expect(card()).toBe("shadow-sm");
    expect(card({ shadow: "sm" })).toBe("shadow-sm");
    expect(card({ shadow: "lg" })).toBe("shadow-lg");

    expect(getSchema(card)).toStrictEqual({
      shadow: { values: ["sm", "md", "lg"], defaultValue: "sm" },
    });
  });

  test("should apply a locally-redeclared variant at the composed default", () => {
    const box = cva({
      variants: { shadow: { sm: "shadow-sm", md: "shadow-md" } },
      defaultVariants: { shadow: "sm" },
    });

    // `card` redeclares `shadow: "sm"` locally. The effective default ("sm",
    // from `box`) must resolve the local class too — so the no-props render
    // matches explicitly selecting that default, and both match `getSchema`.
    const card = cva({
      composes: box,
      variants: { shadow: { sm: "local-sm" } },
    });

    expect(card()).toBe("shadow-sm local-sm");
    expect(card()).toBe(card({ shadow: "sm" }));
    expect(getSchema(card).shadow.defaultValue).toBe("sm");
  });

  test("should keep the schema type when a local default overrides a composed one", () => {
    const b = cva({
      variants: { style: { primary: "b-primary", secondary: "b-secondary" } },
      defaultVariants: { style: "primary" },
    });
    const combined = cva({
      composes: b,
      variants: { style: { secondary: "c-secondary" } },
      defaultVariants: { style: "secondary" },
    });

    const schema = getSchema(combined);

    expect(schema).toStrictEqual({
      style: { values: ["primary", "secondary"], defaultValue: "secondary" },
    });
    // A plain intersection would collapse `"primary" & "secondary"` to `never`
    // and silently drop `style` from this type.
    expectTypeOf(schema).toEqualTypeOf<{
      style: {
        values: readonly ("primary" | "secondary")[];
        defaultValue: "secondary";
      };
    }>();
  });

  test("should support nested composition", () => {
    const box = cva({
      base: "box",
      variants: { shadow: { sm: "shadow-sm", md: "shadow-md" } },
      defaultVariants: { shadow: "sm" },
    });
    const inner = cva({ base: "inner", composes: box });
    const outer = cva({ base: "outer", composes: inner });

    expect(outer()).toBe("box shadow-sm inner outer");
    expect(outer({ shadow: "md" })).toBe("box shadow-md inner outer");
    expect(getSchema(outer)).toStrictEqual({
      shadow: { values: ["sm", "md"], defaultValue: "sm" },
    });
  });

  test("should support a readonly/as-const array of composed components", () => {
    const box = cva({
      variants: { shadow: { sm: "shadow-sm" } },
      defaultVariants: { shadow: "sm" },
    });
    const stack = cva({
      variants: { gap: { 1: "gap-1" } },
      defaultVariants: { gap: 1 },
    });

    const card = cva({ composes: [box, stack] as const });

    expect(card()).toBe("shadow-sm gap-1");
    expect(getSchema(card)).toStrictEqual({
      shadow: { values: ["sm"], defaultValue: "sm" },
      gap: { values: [1], defaultValue: 1 },
    });
  });

  test("should support composing a component without variants", () => {
    const plain = cva({ base: "plain" });
    const styled = cva({
      base: "styled",
      variants: { shadow: { sm: "shadow-sm" } },
    });

    const card = cva({ composes: [plain, styled] });

    expect(card()).toBe("plain styled");
    expect(card({ shadow: "sm" })).toBe("plain styled shadow-sm");
    expect(getSchema(card)).toStrictEqual({
      shadow: { values: ["sm"] },
    });
  });

  test("should reject values that aren't cva() components", () => {
    const box = cva({ variants: { shadow: { sm: "shadow-sm" } } });
    const stack = cva({ variants: { gap: { 1: "gap-1" } } });

    // @ts-expect-error — plain function: no `config` property
    cva({ composes: () => "" });
    // @ts-expect-error — plain function inside an array
    cva({ composes: [box, () => ""] });

    const composed = compose(box, stack);
    // @ts-expect-error — `compose()` results carry no `config` and can't be
    // re-composed; compose the original components via `composes` instead
    cva({ composes: composed });
  });
});

describe("cva — internal variants", () => {
  test("should omit a variant prefixed with `_` from VariantProps, but still accept it on the component", () => {
    const button = cva({
      base: "button",
      variants: {
        _intent: {
          primary: "intent-primary",
          secondary: "intent-secondary",
        },
        size: {
          sm: "size-sm",
          lg: "size-lg",
        },
      },
      defaultVariants: {
        _intent: "primary",
        size: "sm",
      },
    });

    expect(button()).toBe("button intent-primary size-sm");

    expectTypeOf<CVA.VariantProps<typeof button>>().toEqualTypeOf<{
      size?: "sm" | "lg" | undefined;
    }>();

    expect(button({ _intent: "secondary" })).toBe(
      "button intent-secondary size-sm",
    );
  });

  test("should still match compound variants against an internal variant", () => {
    const button = cva({
      base: "button",
      variants: {
        _intent: {
          primary: "intent-primary",
          secondary: "intent-secondary",
        },
        size: {
          sm: "size-sm",
          lg: "size-lg",
        },
      },
      compoundVariants: [
        {
          _intent: "primary",
          size: "lg",
          class: "intent-primary-lg",
        },
        {
          _intent: ["primary", "secondary"],
          size: "sm",
          class: "intent-any-sm",
        },
      ],
      defaultVariants: {
        _intent: "primary",
        size: "sm",
      },
    });

    expect(button({ size: "lg" })).toBe(
      "button intent-primary size-lg intent-primary-lg",
    );
    expect(button()).toBe("button intent-primary size-sm intent-any-sm");
  });

  test("should omit an internal variant from getSchema, at runtime and in its type", () => {
    const button = cva({
      base: "button",
      variants: {
        _intent: {
          primary: "intent-primary",
          secondary: "intent-secondary",
        },
        size: {
          sm: "size-sm",
          lg: "size-lg",
        },
      },
      defaultVariants: {
        _intent: "primary",
        size: "sm",
      },
    });

    const schema = getSchema(button);

    expect(schema).toStrictEqual({
      size: { values: ["sm", "lg"], defaultValue: "sm" },
    });
    expectTypeOf(schema).toEqualTypeOf<{
      size: { values: readonly ("sm" | "lg")[]; defaultValue: "sm" };
    }>();
  });

  test("should omit a composed-only internal variant from the composer's VariantProps and schema", () => {
    const base = cva({
      variants: {
        _tone: {
          quiet: "tone-quiet",
          loud: "tone-loud",
        },
      },
      defaultVariants: { _tone: "quiet" },
    });

    const card = cva({
      composes: base,
      variants: {
        pad: { sm: "pad-sm", lg: "pad-lg" },
      },
      defaultVariants: { pad: "sm" },
    });

    expect(card()).toBe("tone-quiet pad-sm");

    expectTypeOf<CVA.VariantProps<typeof card>>().toEqualTypeOf<{
      pad?: "sm" | "lg" | undefined;
    }>();
    expect(card({ _tone: "loud" })).toBe("tone-loud pad-sm");

    expect(getSchema(card)).toStrictEqual({
      pad: { values: ["sm", "lg"], defaultValue: "sm" },
    });
  });

  test("should let a composer retune a composed-only internal default by redeclaring it locally", () => {
    const base = cva({
      variants: {
        _tone: {
          quiet: "tone-quiet",
          loud: "tone-loud",
        },
      },
      defaultVariants: { _tone: "quiet" },
    });

    const card = cva({
      composes: base,
      variants: { _tone: { loud: "loud-local" } },
      defaultVariants: { _tone: "loud" },
    });

    expect(card()).toBe("tone-loud loud-local");
    expect(getSchema(card)).toStrictEqual({});
  });
});

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

describe("cva", () => {
  describe("without base", () => {
    describe("without anything", () => {
      test("empty", () => {
        // @ts-expect-error
        const example = cva();
        expect(example()).toBe("");
        expect(
          example({
            // @ts-expect-error
            aCheekyInvalidProp: "lol",
          }),
        ).toBe("");
        expect(example({ class: "adhoc-class" })).toBe("adhoc-class");
        expect(example({ className: "adhoc-className" })).toBe(
          "adhoc-className",
        );
        expect(
          example({
            class: "adhoc-class",
            // @ts-expect-error
            className: "adhoc-className",
          }),
        ).toBe("adhoc-class adhoc-className");
      });

      test("undefined", () => {
        // @ts-expect-error
        const example = cva(undefined);
        expect(example()).toBe("");
        expect(
          example({
            // @ts-expect-error
            aCheekyInvalidProp: "lol",
          }),
        ).toBe("");
        expect(example({ class: "adhoc-class" })).toBe("adhoc-class");
        expect(example({ className: "adhoc-className" })).toBe(
          "adhoc-className",
        );
        expect(
          example({
            class: "adhoc-class",
            // @ts-expect-error
            className: "adhoc-className",
          }),
        ).toBe("adhoc-class adhoc-className");
      });

      test("null", () => {
        const example = cva(
          // @ts-expect-error
          null,
        );
        expect(example()).toBe("");
        expect(
          example({
            // @ts-expect-error
            aCheekyInvalidProp: "lol",
          }),
        ).toBe("");
        expect(example({ class: "adhoc-class" })).toBe("adhoc-class");
        expect(example({ className: "adhoc-className" })).toBe(
          "adhoc-className",
        );
        expect(
          example({
            class: "adhoc-class",
            // @ts-expect-error
            className: "adhoc-className",
          }),
        ).toBe("adhoc-class adhoc-className");
      });
    });

    describe("without defaults", () => {
      const buttonWithoutBaseWithoutDefaultsString = cva({
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
        ],
      });
      const buttonWithoutBaseWithoutDefaultsWithClassNameString = cva({
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
        ],
      });

      const buttonWithoutBaseWithoutDefaultsArray = cva({
        variants: {
          intent: {
            unset: null,
            primary: [
              "button--primary",
              "bg-blue-500",
              "text-white",
              "border-transparent",
              "hover:bg-blue-600",
            ],
            secondary: [
              "button--secondary",
              "bg-white",
              "text-gray-800",
              "border-gray-400",
              "hover:bg-gray-100",
            ],
            warning: [
              "button--warning",
              "bg-yellow-500",
              "border-transparent",
              "hover:bg-yellow-600",
            ],
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
            true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
            false: ["button--enabled", "cursor-pointer"],
          },
          size: {
            unset: null,
            small: ["button--small", "text-sm", "py-1", "px-2"],
            medium: ["button--medium", "text-base", "py-2", "px-4"],
            large: ["button--large", "text-lg", "py-2.5", "px-4"],
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
            class: ["button--primary-medium", "uppercase"],
          },
          {
            intent: "warning",
            disabled: false,
            class: ["button--warning-enabled", "text-gray-800"],
          },
          {
            intent: "warning",
            disabled: true,
            class: [
              "button--warning-disabled",
              [1 && "text-black", { baz: false, bat: null }],
            ],
          },
        ],
      });
      const buttonWithoutBaseWithoutDefaultsWithClassNameArray = cva({
        variants: {
          intent: {
            unset: null,
            primary: [
              "button--primary",
              "bg-blue-500",
              "text-white",
              "border-transparent",
              "hover:bg-blue-600",
            ],
            secondary: [
              "button--secondary",
              "bg-white",
              "text-gray-800",
              "border-gray-400",
              "hover:bg-gray-100",
            ],
            warning: [
              "button--warning",
              "bg-yellow-500",
              "border-transparent",
              "hover:bg-yellow-600",
            ],
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
            true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
            false: ["button--enabled", "cursor-pointer"],
          },
          size: {
            unset: null,
            small: ["button--small", "text-sm", "py-1", "px-2"],
            medium: ["button--medium", "text-base", "py-2", "px-4"],
            large: ["button--large", "text-lg", "py-2.5", "px-4"],
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
            className: ["button--primary-medium", "uppercase"],
          },
          {
            intent: "warning",
            disabled: false,
            className: ["button--warning-enabled", "text-gray-800"],
          },
          {
            intent: "warning",
            disabled: true,
            className: [
              "button--warning-disabled",
              [1 && "text-black", { baz: false, bat: null }],
            ],
          },
        ],
      });

      type ButtonWithoutDefaultsWithoutBaseProps =
        | CVA.VariantProps<typeof buttonWithoutBaseWithoutDefaultsString>
        | CVA.VariantProps<
            typeof buttonWithoutBaseWithoutDefaultsWithClassNameString
          >
        | CVA.VariantProps<typeof buttonWithoutBaseWithoutDefaultsArray>
        | CVA.VariantProps<
            typeof buttonWithoutBaseWithoutDefaultsWithClassNameArray
          >;

      describe.each<[ButtonWithoutDefaultsWithoutBaseProps, string]>([
        [
          // @ts-expect-error
          undefined,
          "",
        ],
        [{}, ""],
        [
          {
            aCheekyInvalidProp: "lol",
          } as ButtonWithoutDefaultsWithoutBaseProps,
          "",
        ],
        [
          { intent: "secondary" },
          "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        ],
        [{ size: "small" }, "button--small text-sm py-1 px-2"],
        [{ disabled: true }, "button--disabled opacity-050 cursor-not-allowed"],
        [
          {
            intent: "secondary",
            size: "unset",
          },
          "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        ],
        [
          { intent: "secondary", size: undefined },
          "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        ],
        [
          { intent: "danger", size: "medium" },
          "button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--medium text-base py-2 px-4",
        ],
        [
          { intent: "warning", size: "large" },
          "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4",
        ],
        [
          { intent: "warning", size: "large", disabled: true },
          "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 button--warning-disabled text-black",
        ],
        [
          { intent: "primary", m: 0 },
          "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 m-0",
        ],
        [
          { intent: "primary", m: 1 },
          "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 m-1",
        ],
        // !@TODO Add type "extractor" including class prop
        [
          {
            intent: "primary",
            m: 1,
            class: "adhoc-class",
          } as ButtonWithoutDefaultsWithoutBaseProps,
          "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 m-1 adhoc-class",
        ],
        [
          {
            intent: "primary",
            m: 1,
            className: "adhoc-classname",
          } as ButtonWithoutDefaultsWithoutBaseProps,
          "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 m-1 adhoc-classname",
        ],
        // typings needed
      ])("button(%o)", (options, expected) => {
        test(`returns ${expected}`, () => {
          expect(buttonWithoutBaseWithoutDefaultsString(options)).toBe(
            expected,
          );
          expect(
            buttonWithoutBaseWithoutDefaultsWithClassNameString(options),
          ).toBe(expected);
          expect(buttonWithoutBaseWithoutDefaultsArray(options)).toBe(expected);
          expect(
            buttonWithoutBaseWithoutDefaultsWithClassNameArray(options),
          ).toBe(expected);
        });
      });
    });

    describe("with defaults", () => {
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
          m: 0,
          disabled: false,
          intent: "primary",
          size: "medium",
        },
      });
      const buttonWithoutBaseWithDefaultsWithClassNameString = cva({
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
      });

      const buttonWithoutBaseWithDefaultsArray = cva({
        base: ["button", "font-semibold", "border", "rounded"],
        variants: {
          intent: {
            unset: null,
            primary: [
              "button--primary",
              "bg-blue-500",
              "text-white",
              "border-transparent",
              "hover:bg-blue-600",
            ],
            secondary: [
              "button--secondary",
              "bg-white",
              "text-gray-800",
              "border-gray-400",
              "hover:bg-gray-100",
            ],
            warning: [
              "button--warning",
              "bg-yellow-500",
              "border-transparent",
              "hover:bg-yellow-600",
            ],
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
            true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
            false: ["button--enabled", "cursor-pointer"],
          },
          size: {
            unset: null,
            small: ["button--small", "text-sm", "py-1", "px-2"],
            medium: ["button--medium", "text-base", "py-2", "px-4"],
            large: ["button--large", "text-lg", "py-2.5", "px-4"],
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
            class: ["button--primary-medium", "uppercase"],
          },
          {
            intent: "warning",
            disabled: false,
            class: ["button--warning-enabled", "text-gray-800"],
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
            class: ["button--warning-danger", "!border-red-500"],
          },
          {
            intent: ["warning", "danger"],
            size: "medium",
            class: ["button--warning-danger-medium"],
          },
        ],
        defaultVariants: {
          m: 0,
          disabled: false,
          intent: "primary",
          size: "medium",
        },
      });
      const buttonWithoutBaseWithDefaultsWithClassNameArray = cva({
        base: ["button", "font-semibold", "border", "rounded"],
        variants: {
          intent: {
            unset: null,
            primary: [
              "button--primary",
              "bg-blue-500",
              "text-white",
              "border-transparent",
              "hover:bg-blue-600",
            ],
            secondary: [
              "button--secondary",
              "bg-white",
              "text-gray-800",
              "border-gray-400",
              "hover:bg-gray-100",
            ],
            warning: [
              "button--warning",
              "bg-yellow-500",
              "border-transparent",
              "hover:bg-yellow-600",
            ],
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
            true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
            false: ["button--enabled", "cursor-pointer"],
          },
          size: {
            unset: null,
            small: ["button--small", "text-sm", "py-1", "px-2"],
            medium: ["button--medium", "text-base", "py-2", "px-4"],
            large: ["button--large", "text-lg", "py-2.5", "px-4"],
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
            className: ["button--primary-medium", "uppercase"],
          },
          {
            intent: "warning",
            disabled: false,
            className: ["button--warning-enabled", "text-gray-800"],
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
      });

      type ButtonWithoutBaseWithDefaultsProps =
        | CVA.VariantProps<typeof buttonWithoutBaseWithDefaultsString>
        | CVA.VariantProps<
            typeof buttonWithoutBaseWithDefaultsWithClassNameString
          >
        | CVA.VariantProps<typeof buttonWithoutBaseWithDefaultsArray>
        | CVA.VariantProps<
            typeof buttonWithoutBaseWithDefaultsWithClassNameArray
          >;

      describe.each<[ButtonWithoutBaseWithDefaultsProps, string]>([
        [
          // @ts-expect-error
          undefined,
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase",
        ],
        [
          {},
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase",
        ],
        [
          {
            aCheekyInvalidProp: "lol",
          } as ButtonWithoutBaseWithDefaultsProps,
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase",
        ],
        [
          { intent: "secondary" },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0",
        ],

        [
          { size: "small" },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--small text-sm py-1 px-2 m-0",
        ],
        [
          { disabled: true },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--disabled opacity-050 cursor-not-allowed button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase",
        ],
        [
          {
            intent: "secondary",
            size: "unset",
          },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer m-0",
        ],
        [
          { intent: "secondary", size: undefined },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0",
        ],
        [
          { intent: "danger", size: "medium" },
          "button font-semibold border rounded button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--warning-danger !border-red-500 button--warning-danger-medium",
        ],
        [
          { intent: "warning", size: "large" },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 m-0 button--warning-enabled text-gray-800 button--warning-danger !border-red-500",
        ],
        [
          { intent: "warning", size: "large", disabled: true },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 m-0 button--warning-disabled text-black button--warning-danger !border-red-500",
        ],
        [
          { intent: "primary", m: 0 },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase",
        ],
        [
          { intent: "primary", m: 1 },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-1 button--primary-medium uppercase",
        ],
        // !@TODO Add type "extractor" including class prop
        [
          {
            intent: "primary",
            m: 0,
            class: "adhoc-class",
          } as ButtonWithoutBaseWithDefaultsProps,
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase adhoc-class",
        ],
        [
          {
            intent: "primary",
            m: 1,
            className: "adhoc-classname",
          } as ButtonWithoutBaseWithDefaultsProps,
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-1 button--primary-medium uppercase adhoc-classname",
        ],
      ])("button(%o)", (options, expected) => {
        test(`returns ${expected}`, () => {
          expect(buttonWithoutBaseWithDefaultsString(options)).toBe(expected);
          expect(
            buttonWithoutBaseWithDefaultsWithClassNameString(options),
          ).toBe(expected);
          expect(buttonWithoutBaseWithDefaultsArray(options)).toBe(expected);
          expect(buttonWithoutBaseWithDefaultsWithClassNameArray(options)).toBe(
            expected,
          );
        });
      });
    });
  });

  describe("with base", () => {
    describe("without defaults", () => {
      const buttonWithBaseWithoutDefaultsString = cva({
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
      });
      const buttonWithBaseWithoutDefaultsWithClassNameString = cva({
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
      });

      const buttonWithBaseWithoutDefaultsArray = cva({
        base: ["button", "font-semibold", "border", "rounded"],
        variants: {
          intent: {
            unset: null,
            primary: [
              "button--primary",
              "bg-blue-500",
              "text-white",
              "border-transparent",
              "hover:bg-blue-600",
            ],
            secondary: [
              "button--secondary",
              "bg-white",
              "text-gray-800",
              "border-gray-400",
              "hover:bg-gray-100",
            ],
            warning: [
              "button--warning",
              "bg-yellow-500",
              "border-transparent",
              "hover:bg-yellow-600",
            ],
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
            true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
            false: ["button--enabled", "cursor-pointer"],
          },
          size: {
            unset: null,
            small: ["button--small", "text-sm", "py-1", "px-2"],
            medium: ["button--medium", "text-base", "py-2", "px-4"],
            large: ["button--large", "text-lg", "py-2.5", "px-4"],
          },
        },
        compoundVariants: [
          {
            intent: "primary",
            size: "medium",
            class: ["button--primary-medium", "uppercase"],
          },
          {
            intent: "warning",
            disabled: false,
            class: ["button--warning-enabled", "text-gray-800"],
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
            class: ["button--warning-danger", "!border-red-500"],
          },
          {
            intent: ["warning", "danger"],
            size: "medium",
            class: ["button--warning-danger-medium"],
          },
        ],
      });
      const buttonWithBaseWithoutDefaultsWithClassNameArray = cva({
        base: ["button", "font-semibold", "border", "rounded"],
        variants: {
          intent: {
            unset: null,
            primary: [
              "button--primary",
              "bg-blue-500",
              "text-white",
              "border-transparent",
              "hover:bg-blue-600",
            ],
            secondary: [
              "button--secondary",
              "bg-white",
              "text-gray-800",
              "border-gray-400",
              "hover:bg-gray-100",
            ],
            warning: [
              "button--warning",
              "bg-yellow-500",
              "border-transparent",
              "hover:bg-yellow-600",
            ],
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
            true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
            false: ["button--enabled", "cursor-pointer"],
          },
          size: {
            unset: null,
            small: ["button--small", "text-sm", "py-1", "px-2"],
            medium: ["button--medium", "text-base", "py-2", "px-4"],
            large: ["button--large", "text-lg", "py-2.5", "px-4"],
          },
        },
        compoundVariants: [
          {
            intent: "primary",
            size: "medium",
            className: ["button--primary-medium", "uppercase"],
          },
          {
            intent: "warning",
            disabled: false,
            className: ["button--warning-enabled", "text-gray-800"],
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
            className: ["button--warning-danger", "!border-red-500"],
          },
          {
            intent: ["warning", "danger"],
            size: "medium",
            className: ["button--warning-danger-medium"],
          },
        ],
      });

      type ButtonWithBaseWithoutDefaultsProps =
        | CVA.VariantProps<typeof buttonWithBaseWithoutDefaultsString>
        | CVA.VariantProps<
            typeof buttonWithBaseWithoutDefaultsWithClassNameString
          >
        | CVA.VariantProps<typeof buttonWithBaseWithoutDefaultsArray>
        | CVA.VariantProps<
            typeof buttonWithBaseWithoutDefaultsWithClassNameArray
          >;

      describe.each<[ButtonWithBaseWithoutDefaultsProps, string]>([
        [
          undefined as unknown as ButtonWithBaseWithoutDefaultsProps,
          "button font-semibold border rounded",
        ],
        [{}, "button font-semibold border rounded"],
        [
          {
            // @ts-expect-error
            aCheekyInvalidProp: "lol",
          },
          "button font-semibold border rounded",
        ],
        [
          { intent: "secondary" },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        ],

        [
          { size: "small" },
          "button font-semibold border rounded button--small text-sm py-1 px-2",
        ],
        [
          { disabled: false },
          "button font-semibold border rounded button--enabled cursor-pointer",
        ],
        [
          { disabled: true },
          "button font-semibold border rounded button--disabled opacity-050 cursor-not-allowed",
        ],
        [
          { intent: "secondary", size: "unset" },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        ],
        [
          { intent: "secondary", size: undefined },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        ],
        [
          { intent: "danger", size: "medium" },
          "button font-semibold border rounded button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--medium text-base py-2 px-4 button--warning-danger !border-red-500 button--warning-danger-medium",
        ],
        [
          { intent: "warning", size: "large" },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4 button--warning-danger !border-red-500",
        ],
        [
          { intent: "warning", size: "large", disabled: "unset" },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4 button--warning-danger !border-red-500",
        ],
        [
          { intent: "warning", size: "large", disabled: true },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 button--warning-disabled text-black button--warning-danger !border-red-500",
        ],
        [
          { intent: "warning", size: "large", disabled: false },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 button--warning-enabled text-gray-800 button--warning-danger !border-red-500",
        ],
        // !@TODO Add type "extractor" including class prop
        [
          {
            intent: "primary",
            class: "adhoc-class",
          } as ButtonWithBaseWithoutDefaultsProps,
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 adhoc-class",
        ],
        [
          {
            intent: "primary",
            className: "adhoc-className",
          } as ButtonWithBaseWithoutDefaultsProps,
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 adhoc-className",
        ],
      ])("button(%o)", (options, expected) => {
        test(`returns ${expected}`, () => {
          expect(buttonWithBaseWithoutDefaultsString(options)).toBe(expected);
          expect(
            buttonWithBaseWithoutDefaultsWithClassNameString(options),
          ).toBe(expected);
          expect(buttonWithBaseWithoutDefaultsArray(options)).toBe(expected);
          expect(buttonWithBaseWithoutDefaultsWithClassNameArray(options)).toBe(
            expected,
          );
        });
      });
    });

    describe("with defaults", () => {
      const buttonWithBaseWithDefaultsString = cva({
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
      const buttonWithBaseWithDefaultsWithClassNameString = cva({
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
          disabled: false,
          intent: "primary",
          size: "medium",
        },
      });

      const buttonWithBaseWithDefaultsArray = cva({
        base: ["button", "font-semibold", "border", "rounded"],
        variants: {
          intent: {
            unset: null,
            primary: [
              "button--primary",
              "bg-blue-500",
              "text-white",
              "border-transparent",
              "hover:bg-blue-600",
            ],
            secondary: [
              "button--secondary",
              "bg-white",
              "text-gray-800",
              "border-gray-400",
              "hover:bg-gray-100",
            ],
            warning: [
              "button--warning",
              "bg-yellow-500",
              "border-transparent",
              "hover:bg-yellow-600",
            ],
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
            true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
            false: ["button--enabled", "cursor-pointer"],
          },
          size: {
            unset: null,
            small: ["button--small", "text-sm", "py-1", "px-2"],
            medium: ["button--medium", "text-base", "py-2", "px-4"],
            large: ["button--large", "text-lg", "py-2.5", "px-4"],
          },
        },
        compoundVariants: [
          {
            intent: "primary",
            size: "medium",
            class: ["button--primary-medium", "uppercase"],
          },
          {
            intent: "warning",
            disabled: false,
            class: ["button--warning-enabled", "text-gray-800"],
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
            class: ["button--warning-danger", "!border-red-500"],
          },
          {
            intent: ["warning", "danger"],
            size: "medium",
            class: ["button--warning-danger-medium"],
          },
        ],
        defaultVariants: {
          disabled: false,
          intent: "primary",
          size: "medium",
        },
      });
      const buttonWithBaseWithDefaultsWithClassNameArray = cva({
        base: ["button", "font-semibold", "border", "rounded"],
        variants: {
          intent: {
            unset: null,
            primary: [
              "button--primary",
              "bg-blue-500",
              "text-white",
              "border-transparent",
              "hover:bg-blue-600",
            ],
            secondary: [
              "button--secondary",
              "bg-white",
              "text-gray-800",
              "border-gray-400",
              "hover:bg-gray-100",
            ],
            warning: [
              "button--warning",
              "bg-yellow-500",
              "border-transparent",
              "hover:bg-yellow-600",
            ],
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
            true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
            false: ["button--enabled", "cursor-pointer"],
          },
          size: {
            unset: null,
            small: ["button--small", "text-sm", "py-1", "px-2"],
            medium: ["button--medium", "text-base", "py-2", "px-4"],
            large: ["button--large", "text-lg", "py-2.5", "px-4"],
          },
        },
        compoundVariants: [
          {
            intent: "primary",
            size: "medium",
            className: ["button--primary-medium", "uppercase"],
          },
          {
            intent: "warning",
            disabled: false,
            className: ["button--warning-enabled", "text-gray-800"],
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
            className: ["button--warning-danger", "!border-red-500"],
          },
          {
            intent: ["warning", "danger"],
            size: "medium",
            className: ["button--warning-danger-medium"],
          },
        ],
        defaultVariants: {
          disabled: false,
          intent: "primary",
          size: "medium",
        },
      });

      type ButtonWithBaseWithDefaultsProps =
        | CVA.VariantProps<typeof buttonWithBaseWithDefaultsString>
        | CVA.VariantProps<typeof buttonWithBaseWithDefaultsWithClassNameString>
        | CVA.VariantProps<typeof buttonWithBaseWithDefaultsArray>
        | CVA.VariantProps<typeof buttonWithBaseWithDefaultsWithClassNameArray>;

      describe.each<[ButtonWithBaseWithDefaultsProps, string]>([
        [
          // @ts-expect-error
          undefined,
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        [
          {},
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        [
          {
            aCheekyInvalidProp: "lol",
          } as ButtonWithBaseWithDefaultsProps,
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        [
          { intent: "secondary" },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4",
        ],

        [
          { size: "small" },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--small text-sm py-1 px-2",
        ],
        [
          { disabled: "unset" },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        [
          { disabled: false },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        [
          { disabled: true },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--disabled opacity-050 cursor-not-allowed button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        [
          { intent: "secondary", size: "unset" },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer",
        ],
        [
          { intent: "secondary", size: undefined },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4",
        ],
        [
          { intent: "danger", size: "medium" },
          "button font-semibold border rounded button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--warning-danger !border-red-500 button--warning-danger-medium",
        ],
        [
          { intent: "warning", size: "large" },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 button--warning-enabled text-gray-800 button--warning-danger !border-red-500",
        ],
        [
          {
            intent: "warning",
            size: "large",
            disabled: "unset",
          },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4 button--warning-danger !border-red-500",
        ],
        [
          { intent: "warning", size: "large", disabled: true },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 button--warning-disabled text-black button--warning-danger !border-red-500",
        ],
        [
          { intent: "warning", size: "large", disabled: false },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 button--warning-enabled text-gray-800 button--warning-danger !border-red-500",
        ],
        // !@TODO Add type "extractor" including class prop
        [
          {
            intent: "primary",
            class: "adhoc-class",
          } as ButtonWithBaseWithDefaultsProps,
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase adhoc-class",
        ],
        [
          {
            intent: "primary",
            className: "adhoc-classname",
          } as ButtonWithBaseWithDefaultsProps,
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase adhoc-classname",
        ],
      ])("button(%o)", (options, expected) => {
        test(`returns ${expected}`, () => {
          expect(buttonWithBaseWithDefaultsString(options)).toBe(expected);
          expect(buttonWithBaseWithDefaultsWithClassNameString(options)).toBe(
            expected,
          );
          expect(buttonWithBaseWithDefaultsArray(options)).toBe(expected);
          expect(buttonWithBaseWithDefaultsWithClassNameArray(options)).toBe(
            expected,
          );
        });
      });
    });
  });
});

describe("CVAVariantShape", () => {
  test("types a standalone variants config passed to cva", () => {
    const variants = {
      intent: {
        primary: "button--primary",
        secondary: "button--secondary",
      },
    } satisfies CVA.CVAVariantShape;

    const button = cva({ variants });

    expectTypeOf<CVA.VariantProps<typeof button>>().toEqualTypeOf<{
      intent?: "primary" | "secondary" | undefined;
    }>();

    expect(button({ intent: "primary" })).toBe("button--primary");

    // @ts-expect-error — value isn't a `ClassValue` map
    ({ intent: "primary" }) satisfies CVA.CVAVariantShape;
  });
});

describe("exported types", () => {
  test("portability types stay exported", () => {
    // Each name below must be reachable through the `CVA.` namespace
    // import, or this fails to compile. See AGENTS.md Learnings.
    expectTypeOf<CVA.CVAComponentShape>().toEqualTypeOf<
      CVA.CVAComponent<any, any>
    >();
    expectTypeOf<CVA.CVAVariantShape>().toEqualTypeOf<
      Record<string, Record<string, CVA.ClassValue>>
    >();
  });
});

describe("defineConfig", () => {
  describe("hooks", () => {
    describe("onComplete", () => {
      const PREFIX = "never-gonna-give-you-up";
      const SUFFIX = "never-gonna-let-you-down";

      const onCompleteHandler = (className: string) =>
        [PREFIX, className, SUFFIX].join(" ");

      test("should extend compose", () => {
        const { compose: composeExtended } = defineConfig({
          hooks: {
            onComplete: onCompleteHandler,
          },
        });

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
        const card = composeExtended(box, stack);

        expectTypeOf(card).toBeFunction();

        const cardClassList = card();
        const cardClassListSplit = cardClassList.split(" ");
        expect(cardClassListSplit[0]).toBe(PREFIX);
        expect(cardClassListSplit[cardClassListSplit.length - 1]).toBe(SUFFIX);

        const cardShadowGapClassList = card({ shadow: "md", gap: 3 });
        const cardShadowGapClassListSplit = cardShadowGapClassList.split(" ");
        expect(cardShadowGapClassListSplit[0]).toBe(PREFIX);
        expect(
          cardShadowGapClassListSplit[cardShadowGapClassListSplit.length - 1],
        ).toBe(SUFFIX);
      });

      test("should extend cva", () => {
        const { cva: cvaExtended } = defineConfig({
          hooks: {
            onComplete: onCompleteHandler,
          },
        });

        const component = cvaExtended({
          base: "foo",
          variants: { intent: { primary: "bar" } },
        });
        const componentClassList = component({ intent: "primary" });
        const componentClassListSplit = componentClassList.split(" ");

        expectTypeOf(component).toBeFunction();
        expect(componentClassListSplit[0]).toBe(PREFIX);
        expect(
          componentClassListSplit[componentClassListSplit.length - 1],
        ).toBe(SUFFIX);
      });

      test("should extend cx", () => {
        const { cx: cxExtended } = defineConfig({
          hooks: {
            onComplete: onCompleteHandler,
          },
        });

        const classList = cxExtended("foo", "bar");
        const classListSplit = classList.split(" ");

        expectTypeOf(classList).toBeString();
        expect(classListSplit[0]).toBe(PREFIX);
        expect(classListSplit[classListSplit.length - 1]).toBe(SUFFIX);
      });
    });
  });
});
