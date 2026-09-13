import { clsx } from "clsx";
import type * as CVA from "./";
import { compose, cva, cx, defineConfig, getSchema } from "./";
import { getSchema as getSchemaUtils } from "./utils";

describe("clsx (the `cva` preset default)", () => {
  test("infers the full ClassValue authoring surface", () => {
    expectTypeOf(clsx).toExtend<CVA.CX>();
    expectTypeOf<CVA.CXInput<typeof clsx>>().toEqualTypeOf<CVA.ClassValue>();
  });

  test.each<{ name: string; inputs: CVA.ClassValue[] }>([
    {
      name: "mixed strings, arrays, objects, and numbers",
      inputs: ["foo", ["bar", { baz: true, qux: false }], 1],
    },
    {
      name: "empty and boolean values",
      inputs: [null, undefined, false, true, ""],
    },
    {
      name: "deeply nested arrays",
      inputs: [[[["deeply", ["nested"]]], { object: 1 }]],
    },
  ])("cx matches clsx for $name", ({ inputs }) => {
    expect(cx(...inputs)).toBe(clsx(...inputs));
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

describe("cx", () => {
  test.each<[CVA.ClassValue, string]>([
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
    ],
    [
      [
        "foo",
        [1 && "bar", { baz: false, bat: null }, ["hello", ["world"]]],
        "cya",
      ],
      "foo bar hello world cya",
    ],
  ])("cx(%o) returns %s", (options, expected) => {
    expect(cx(options)).toBe(expected);
  });
});

describe("compose", () => {
  test("should merge non-variant config values and tolerate a missing config", () => {
    // `base` is a string (not a mergeable object), so it overwrites rather
    // than merges when configs are folded together.
    const box = cva({
      base: "box",
      variants: {
        shadow: {
          sm: "shadow-sm",
        },
      },
    });
    const plainFunction = () => "plain";

    // @ts-expect-error: not a cva()-created component (no `.config`), which
    // compose tolerates at runtime.
    const card = compose(box, plainFunction);

    expect(card({ shadow: "sm" })).toBe("box shadow-sm plain");
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

    const card = compose(box, stack);

    expectTypeOf(card).toBeFunction();

    expectTypeOf(card).parameter(0).toExtend<
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

    expectTypeOf(card).parameter(0).toExtend<
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
    expectTypeOf(card).parameter(0).toExtend<
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
    expectTypeOf(card).parameter(0).toExtend<
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

    expectTypeOf(card).parameter(0).toExtend<
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
  test("is also available from cva/utils", () => {
    const button = cva({
      variants: { intent: { primary: "button-primary" } },
    });

    expect(getSchemaUtils(button)).toStrictEqual({
      intent: { values: ["primary"] },
    });
    expectTypeOf(getSchemaUtils).toEqualTypeOf<CVA.GetSchema>();
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
  });
});

describe("cva, zero-valued variant keys", () => {
  // `falsyToString` must normalize a `0` prop/default to the `"0"` object
  // key; `variants.gap[0]` and `variants.gap["0"]` are the same property
  // at runtime, but a bare `0` would short-circuit the `||` fallback chain.
  const spacer = cva({
    base: "spacer",
    variants: {
      gap: {
        0: "gap-0",
        1: "gap-1",
      },
    },
    defaultVariants: {
      gap: 0,
    },
  });

  test("applies a zero default variant", () => {
    expect(spacer({})).toBe("spacer gap-0");
  });

  test("applies an explicit zero variant prop", () => {
    expect(spacer({ gap: 0 })).toBe("spacer gap-0");
  });

  test("applies a non-zero variant prop over the zero default", () => {
    expect(spacer({ gap: 1 })).toBe("spacer gap-1");
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
      CVA.CVAComponent<any, any, any>
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

    describe("cx:done (deprecated)", () => {
      const PREFIX = "we-know-the-game";
      const SUFFIX = "and-were-gonna-play-it";

      const cxDoneHandler = (className: string) =>
        [PREFIX, className, SUFFIX].join(" ");

      test("should extend compose", () => {
        const { compose: composeExtended } = defineConfig({
          hooks: {
            "cx:done": cxDoneHandler,
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
            },
          },
          defaultVariants: {
            gap: "unset",
          },
        });
        const card = composeExtended(box, stack);

        const cardClassListSplit = card({ shadow: "md", gap: 1 }).split(" ");
        expect(cardClassListSplit[0]).toBe(PREFIX);
        expect(cardClassListSplit[cardClassListSplit.length - 1]).toBe(SUFFIX);
      });

      test("should extend cva", () => {
        const { cva: cvaExtended } = defineConfig({
          hooks: {
            "cx:done": cxDoneHandler,
          },
        });

        const component = cvaExtended({
          base: "foo",
          variants: { intent: { primary: "bar" } },
        });
        const componentClassListSplit = component({
          intent: "primary",
        }).split(" ");

        expect(componentClassListSplit[0]).toBe(PREFIX);
        expect(
          componentClassListSplit[componentClassListSplit.length - 1],
        ).toBe(SUFFIX);
      });

      test("should extend cx", () => {
        const { cx: cxExtended } = defineConfig({
          hooks: {
            "cx:done": cxDoneHandler,
          },
        });

        expect(cxExtended("foo", "bar")).toBe(`${PREFIX} foo bar ${SUFFIX}`);
      });

      test("should take precedence over onComplete when both are set", () => {
        const { cx: cxExtended } = defineConfig({
          hooks: {
            "cx:done": cxDoneHandler,
            onComplete: (className) => `on-complete ${className}`,
          },
        });

        expect(cxExtended("foo")).toBe(`${PREFIX} foo ${SUFFIX}`);
      });
    });
  });

  describe("cx", () => {
    test("receives assembled values verbatim, one argument each", () => {
      const calls: unknown[][] = [];
      const recording: CVA.CX = (...inputs) => {
        calls.push(inputs);
        return "recorded";
      };

      const { cva: cvaExtended } = defineConfig({ cx: recording });

      const child = cvaExtended({ base: "child" });
      const badge = cvaExtended({
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
        // @ts-expect-error — objects aren't part of this concatenator's grammar
        base: { "bg-gray-200": true },
      });
      narrowCva({
        // @ts-expect-error — object-syntax variant values fail the variants gate
        variants: { intent: { primary: { "bg-blue-500": true } } },
      });
      // @ts-expect-error — and neither are object-syntax class props
      button({ intent: "primary", class: { extra: true } });
    });

    test("falls back to the full ClassValue grammar when nothing narrower is inferrable", () => {
      const { cva: inlineCva } = defineConfig({
        cx: (...inputs) => inputs.filter(Boolean).join("|"),
      });
      const { cva: unknownCva } = defineConfig({
        cx: (...inputs: unknown[]) => inputs.filter(Boolean).join("|"),
      });

      for (const cvaExtended of [inlineCva, unknownCva]) {
        const badge = cvaExtended({
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
      // A wider-than-grammar parameter narrows to the shared subset rather
      // than reopening values the concatenator rejects. (Object types such
      // as `URL` already satisfy `ClassDictionary`, so they stay.)
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

    test("infers from the last signature of an overloaded concatenator", () => {
      interface OverloadedCX {
        (strings: TemplateStringsArray, ...values: string[]): string;
        (...inputs: CVA.ClassValue[]): string;
      }

      expectTypeOf<CVA.CXInput<OverloadedCX>>().toEqualTypeOf<CVA.ClassValue>();
    });
  });
});

describe("cva — variant matrix", () => {
  const stringVariantsWithM = {
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
    m: { unset: null, 0: "m-0", 1: "m-1" },
  };

  const arrayVariantsWithM = {
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
    m: { unset: null, 0: "m-0", 1: "m-1" },
  };

  const stringVariants = {
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
  };

  const arrayVariants = {
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
  };

  type ClassCompound =
    | { intent: "primary"; size: "medium"; class: CVA.ClassValue }
    | { intent: "warning"; disabled: false; class: CVA.ClassValue }
    | { intent: "warning"; disabled: true; class: CVA.ClassValue }
    | { intent: ("warning" | "danger")[]; class: CVA.ClassValue }
    | {
        intent: ("warning" | "danger")[];
        size: "medium";
        class: CVA.ClassValue;
      };
  type ClassNameCompound =
    | { intent: "primary"; size: "medium"; className: CVA.ClassValue }
    | { intent: "warning"; disabled: false; className: CVA.ClassValue }
    | { intent: "warning"; disabled: true; className: CVA.ClassValue }
    | { intent: ("warning" | "danger")[]; className: CVA.ClassValue }
    | {
        intent: ("warning" | "danger")[];
        size: "medium";
        className: CVA.ClassValue;
      };

  type VariantPropsWithM = {
    intent?:
      | "unset"
      | "primary"
      | "secondary"
      | "warning"
      | "danger"
      | undefined;
    disabled?: "unset" | boolean | undefined;
    size?: "unset" | "small" | "medium" | "large" | undefined;
    m?: "unset" | 0 | 1 | undefined;
  };

  type VariantPropsWithoutM = {
    intent?:
      | "unset"
      | "primary"
      | "secondary"
      | "warning"
      | "danger"
      | undefined;
    disabled?: "unset" | boolean | undefined;
    size?: "unset" | "small" | "medium" | "large" | undefined;
  };

  const noDefaultsClass: ClassCompound[] = [
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
  ];
  const noDefaultsClassName: ClassNameCompound[] = [
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
  ];
  const defaultsClass: ClassCompound[] = [
    ...noDefaultsClass,
    {
      intent: ["warning", "danger"],
      class: "button--warning-danger !border-red-500",
    },
    {
      intent: ["warning", "danger"],
      size: "medium",
      class: "button--warning-danger-medium",
    },
  ];
  const defaultsClassName: ClassNameCompound[] = [
    ...noDefaultsClassName,
    {
      intent: ["warning", "danger"],
      className: "button--warning-danger !border-red-500",
    },
    {
      intent: ["warning", "danger"],
      size: "medium",
      className: "button--warning-danger-medium",
    },
  ];
  const noDefaultsArrayClass: ClassCompound[] = [
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
  ];
  const noDefaultsArrayClassName: ClassNameCompound[] = [
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
  ];
  const defaultsArrayClass: ClassCompound[] = [
    ...noDefaultsArrayClass,
    {
      intent: ["warning", "danger"],
      class: ["button--warning-danger", "!border-red-500"],
    },
    {
      intent: ["warning", "danger"],
      size: "medium",
      class: ["button--warning-danger-medium"],
    },
  ];
  const defaultsArrayClassName: ClassNameCompound[] = [
    ...noDefaultsArrayClassName,
    {
      intent: ["warning", "danger"],
      className: ["button--warning-danger", "!border-red-500"],
    },
    {
      intent: ["warning", "danger"],
      size: "medium",
      className: ["button--warning-danger-medium"],
    },
  ];
  const noBaseDefaultsArrayClassName: ClassNameCompound[] = [
    ...noDefaultsArrayClassName,
    {
      intent: ["warning", "danger"],
      className: "button--warning-danger !border-red-500",
    },
    {
      intent: ["warning", "danger"],
      size: "medium",
      className: "button--warning-danger-medium",
    },
  ];

  function matrix<Fixture extends (props?: any) => string>(
    group: string,
    fixture: string,
    component: Fixture,
    rows: readonly [
      name: string,
      props: Parameters<Fixture>[0],
      expected: string,
    ][],
  ) {
    test.each(rows)(`${group} / ${fixture} / %s`, (_, props, expected) => {
      expect(component(props)).toBe(expected);
    });
  }

  describe("without base / without defaults", () => {
    const stringClass = cva({
      variants: stringVariantsWithM,
      compoundVariants: noDefaultsClass,
    });
    const stringClassName = cva({
      variants: stringVariantsWithM,
      compoundVariants: noDefaultsClassName,
    });
    const arrayClass = cva({
      variants: arrayVariantsWithM,
      compoundVariants: noDefaultsArrayClass,
    });
    const arrayClassName = cva({
      variants: arrayVariantsWithM,
      compoundVariants: noDefaultsArrayClassName,
    });
    test("without base / without defaults / variant props remain exact", () => {
      expectTypeOf<
        CVA.VariantProps<typeof stringClass>
      >().toEqualTypeOf<VariantPropsWithM>();
      expectTypeOf<
        CVA.VariantProps<typeof stringClassName>
      >().toEqualTypeOf<VariantPropsWithM>();
      expectTypeOf<
        CVA.VariantProps<typeof arrayClass>
      >().toEqualTypeOf<VariantPropsWithM>();
      expectTypeOf<
        CVA.VariantProps<typeof arrayClassName>
      >().toEqualTypeOf<VariantPropsWithM>();
    });
    type Props = Parameters<typeof stringClass>[0];
    const rows: readonly [string, Props, string][] = [
      ["undefined", undefined, ""],
      ["empty", {}, ""],
      [
        "secondary",
        { intent: "secondary" },
        "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
      ],
      ["small", { size: "small" }, "button--small text-sm py-1 px-2"],
      [
        "disabled",
        { disabled: true },
        "button--disabled opacity-050 cursor-not-allowed",
      ],
      [
        "secondary unset",
        { intent: "secondary", size: "unset" },
        "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
      ],
      [
        "secondary undefined",
        { intent: "secondary", size: undefined },
        "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
      ],
      [
        "danger medium",
        { intent: "danger", size: "medium" },
        "button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--medium text-base py-2 px-4",
      ],
      [
        "warning large",
        { intent: "warning", size: "large" },
        "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4",
      ],
      [
        "warning disabled",
        { intent: "warning", size: "large", disabled: true },
        "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 button--warning-disabled text-black",
      ],
      [
        "m zero",
        { intent: "primary", m: 0 },
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 m-0",
      ],
      [
        "m one",
        { intent: "primary", m: 1 },
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 m-1",
      ],
      [
        "class",
        { intent: "primary", m: 1, class: "adhoc-class" },
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 m-1 adhoc-class",
      ],
      [
        "className",
        { intent: "primary", m: 1, className: "adhoc-classname" },
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 m-1 adhoc-classname",
      ],
    ];
    matrix(
      "without base / without defaults",
      "string class",
      stringClass,
      rows,
    );
    matrix(
      "without base / without defaults",
      "string className",
      stringClassName,
      rows,
    );
    matrix("without base / without defaults", "array class", arrayClass, rows);
    matrix(
      "without base / without defaults",
      "array className",
      arrayClassName,
      rows,
    );
    for (const [name, component] of [
      ["string class", stringClass],
      ["string className", stringClassName],
      ["array class", arrayClass],
      ["array className", arrayClassName],
    ] as const) {
      test(`without base / without defaults / ${name} / invalid prop`, () => {
        // @ts-expect-error — deliberately invalid runtime input
        expect(component({ aCheekyInvalidProp: "lol" })).toBe("");
      });
    }
  });

  describe("without base / with defaults", () => {
    const stringClass = cva({
      variants: stringVariantsWithM,
      compoundVariants: defaultsClass,
      defaultVariants: {
        m: 0,
        disabled: false,
        intent: "primary",
        size: "medium",
      },
    });
    const stringClassName = cva({
      variants: stringVariantsWithM,
      compoundVariants: defaultsClassName,
      defaultVariants: {
        m: 0,
        disabled: false,
        intent: "primary",
        size: "medium",
      },
    });
    const arrayClass = cva({
      variants: arrayVariantsWithM,
      compoundVariants: defaultsArrayClass,
      defaultVariants: {
        m: 0,
        disabled: false,
        intent: "primary",
        size: "medium",
      },
    });
    const arrayClassName = cva({
      variants: arrayVariantsWithM,
      compoundVariants: noBaseDefaultsArrayClassName,
      defaultVariants: {
        m: 0,
        disabled: false,
        intent: "primary",
        size: "medium",
      },
    });
    test("without base / with defaults / variant props remain exact", () => {
      expectTypeOf<
        CVA.VariantProps<typeof stringClass>
      >().toEqualTypeOf<VariantPropsWithM>();
      expectTypeOf<
        CVA.VariantProps<typeof stringClassName>
      >().toEqualTypeOf<VariantPropsWithM>();
      expectTypeOf<
        CVA.VariantProps<typeof arrayClass>
      >().toEqualTypeOf<VariantPropsWithM>();
      expectTypeOf<
        CVA.VariantProps<typeof arrayClassName>
      >().toEqualTypeOf<VariantPropsWithM>();
    });
    type Props = Parameters<typeof stringClass>[0];
    const rows: readonly [string, Props, string][] = [
      [
        "undefined",
        undefined,
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase",
      ],
      [
        "empty",
        {},
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase",
      ],
      [
        "secondary",
        { intent: "secondary" },
        "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0",
      ],
      [
        "small",
        { size: "small" },
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--small text-sm py-1 px-2 m-0",
      ],
      [
        "disabled",
        { disabled: true },
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--disabled opacity-050 cursor-not-allowed button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase",
      ],
      [
        "secondary unset",
        { intent: "secondary", size: "unset" },
        "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer m-0",
      ],
      [
        "secondary undefined",
        { intent: "secondary", size: undefined },
        "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0",
      ],
      [
        "danger medium",
        { intent: "danger", size: "medium" },
        "button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--warning-danger !border-red-500 button--warning-danger-medium",
      ],
      [
        "warning large",
        { intent: "warning", size: "large" },
        "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 m-0 button--warning-enabled text-gray-800 button--warning-danger !border-red-500",
      ],
      [
        "warning disabled",
        { intent: "warning", size: "large", disabled: true },
        "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 m-0 button--warning-disabled text-black button--warning-danger !border-red-500",
      ],
      [
        "m zero",
        { intent: "primary", m: 0 },
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase",
      ],
      [
        "m one",
        { intent: "primary", m: 1 },
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-1 button--primary-medium uppercase",
      ],
      [
        "class",
        { intent: "primary", m: 0, class: "adhoc-class" },
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase adhoc-class",
      ],
      [
        "className",
        { intent: "primary", m: 1, className: "adhoc-classname" },
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-1 button--primary-medium uppercase adhoc-classname",
      ],
    ];
    matrix("without base / with defaults", "string class", stringClass, rows);
    matrix(
      "without base / with defaults",
      "string className",
      stringClassName,
      rows,
    );
    matrix("without base / with defaults", "array class", arrayClass, rows);
    matrix(
      "without base / with defaults",
      "array className",
      arrayClassName,
      rows,
    );
    for (const [name, component] of [
      ["string class", stringClass],
      ["string className", stringClassName],
      ["array class", arrayClass],
      ["array className", arrayClassName],
    ] as const) {
      test(`without base / with defaults / ${name} / invalid prop`, () => {
        // @ts-expect-error — deliberately invalid runtime input
        expect(component({ aCheekyInvalidProp: "lol" })).toBe(
          "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 m-0 button--primary-medium uppercase",
        );
      });
    }
  });

  describe("with base / without defaults", () => {
    const stringClass = cva({
      base: "button font-semibold border rounded",
      variants: stringVariants,
      compoundVariants: defaultsClass,
    });
    const stringClassName = cva({
      base: "button font-semibold border rounded",
      variants: stringVariants,
      compoundVariants: defaultsClassName,
    });
    const arrayClass = cva({
      base: ["button", "font-semibold", "border", "rounded"],
      variants: arrayVariants,
      compoundVariants: defaultsArrayClass,
    });
    const arrayClassName = cva({
      base: ["button", "font-semibold", "border", "rounded"],
      variants: arrayVariants,
      compoundVariants: defaultsArrayClassName,
    });
    test("with base / without defaults / variant props remain exact", () => {
      expectTypeOf<
        CVA.VariantProps<typeof stringClass>
      >().toEqualTypeOf<VariantPropsWithoutM>();
      expectTypeOf<
        CVA.VariantProps<typeof stringClassName>
      >().toEqualTypeOf<VariantPropsWithoutM>();
      expectTypeOf<
        CVA.VariantProps<typeof arrayClass>
      >().toEqualTypeOf<VariantPropsWithoutM>();
      expectTypeOf<
        CVA.VariantProps<typeof arrayClassName>
      >().toEqualTypeOf<VariantPropsWithoutM>();
    });
    type Props = Parameters<typeof stringClass>[0];
    const rows: readonly [string, Props, string][] = [
      ["undefined", undefined, "button font-semibold border rounded"],
      ["empty", {}, "button font-semibold border rounded"],
      [
        "secondary",
        { intent: "secondary" },
        "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
      ],
      [
        "small",
        { size: "small" },
        "button font-semibold border rounded button--small text-sm py-1 px-2",
      ],
      [
        "disabled false",
        { disabled: false },
        "button font-semibold border rounded button--enabled cursor-pointer",
      ],
      [
        "disabled",
        { disabled: true },
        "button font-semibold border rounded button--disabled opacity-050 cursor-not-allowed",
      ],
      [
        "secondary unset",
        { intent: "secondary", size: "unset" },
        "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
      ],
      [
        "secondary undefined",
        { intent: "secondary", size: undefined },
        "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
      ],
      [
        "danger medium",
        { intent: "danger", size: "medium" },
        "button font-semibold border rounded button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--medium text-base py-2 px-4 button--warning-danger !border-red-500 button--warning-danger-medium",
      ],
      [
        "warning large",
        { intent: "warning", size: "large" },
        "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4 button--warning-danger !border-red-500",
      ],
      [
        "warning unset",
        { intent: "warning", size: "large", disabled: "unset" },
        "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4 button--warning-danger !border-red-500",
      ],
      [
        "warning disabled",
        { intent: "warning", size: "large", disabled: true },
        "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 button--warning-disabled text-black button--warning-danger !border-red-500",
      ],
      [
        "warning enabled",
        { intent: "warning", size: "large", disabled: false },
        "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 button--warning-enabled text-gray-800 button--warning-danger !border-red-500",
      ],
      [
        "class",
        { intent: "primary", class: "adhoc-class" },
        "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 adhoc-class",
      ],
      [
        "className",
        { intent: "primary", className: "adhoc-className" },
        "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 adhoc-className",
      ],
    ];
    matrix("with base / without defaults", "string class", stringClass, rows);
    matrix(
      "with base / without defaults",
      "string className",
      stringClassName,
      rows,
    );
    matrix("with base / without defaults", "array class", arrayClass, rows);
    matrix(
      "with base / without defaults",
      "array className",
      arrayClassName,
      rows,
    );
    for (const [name, component] of [
      ["string class", stringClass],
      ["string className", stringClassName],
      ["array class", arrayClass],
      ["array className", arrayClassName],
    ] as const) {
      test(`with base / without defaults / ${name} / invalid prop`, () => {
        // @ts-expect-error — deliberately invalid runtime input
        expect(component({ aCheekyInvalidProp: "lol" })).toBe(
          "button font-semibold border rounded",
        );
      });
    }
  });

  describe("with base / with defaults", () => {
    const stringClass = cva({
      base: "button font-semibold border rounded",
      variants: stringVariants,
      compoundVariants: defaultsClass,
      defaultVariants: { disabled: false, intent: "primary", size: "medium" },
    });
    const stringClassName = cva({
      base: "button font-semibold border rounded",
      variants: stringVariants,
      compoundVariants: defaultsClassName,
      defaultVariants: { disabled: false, intent: "primary", size: "medium" },
    });
    const arrayClass = cva({
      base: ["button", "font-semibold", "border", "rounded"],
      variants: arrayVariants,
      compoundVariants: defaultsArrayClass,
      defaultVariants: { disabled: false, intent: "primary", size: "medium" },
    });
    const arrayClassName = cva({
      base: ["button", "font-semibold", "border", "rounded"],
      variants: arrayVariants,
      compoundVariants: defaultsArrayClassName,
      defaultVariants: { disabled: false, intent: "primary", size: "medium" },
    });
    test("with base / with defaults / variant props remain exact", () => {
      expectTypeOf<
        CVA.VariantProps<typeof stringClass>
      >().toEqualTypeOf<VariantPropsWithoutM>();
      expectTypeOf<
        CVA.VariantProps<typeof stringClassName>
      >().toEqualTypeOf<VariantPropsWithoutM>();
      expectTypeOf<
        CVA.VariantProps<typeof arrayClass>
      >().toEqualTypeOf<VariantPropsWithoutM>();
      expectTypeOf<
        CVA.VariantProps<typeof arrayClassName>
      >().toEqualTypeOf<VariantPropsWithoutM>();
    });
    type Props = Parameters<typeof stringClass>[0];
    const rows: readonly [string, Props, string][] = [
      [
        "undefined",
        undefined,
        "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
      ],
      [
        "empty",
        {},
        "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
      ],
      [
        "secondary",
        { intent: "secondary" },
        "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4",
      ],
      [
        "small",
        { size: "small" },
        "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--small text-sm py-1 px-2",
      ],
      [
        "disabled unset",
        { disabled: "unset" },
        "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--medium text-base py-2 px-4 button--primary-medium uppercase",
      ],
      [
        "disabled false",
        { disabled: false },
        "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
      ],
      [
        "disabled",
        { disabled: true },
        "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--disabled opacity-050 cursor-not-allowed button--medium text-base py-2 px-4 button--primary-medium uppercase",
      ],
      [
        "secondary unset",
        { intent: "secondary", size: "unset" },
        "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer",
      ],
      [
        "secondary undefined",
        { intent: "secondary", size: undefined },
        "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4",
      ],
      [
        "danger medium",
        { intent: "danger", size: "medium" },
        "button font-semibold border rounded button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--warning-danger !border-red-500 button--warning-danger-medium",
      ],
      [
        "warning large",
        { intent: "warning", size: "large" },
        "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 button--warning-enabled text-gray-800 button--warning-danger !border-red-500",
      ],
      [
        "warning unset",
        { intent: "warning", size: "large", disabled: "unset" },
        "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4 button--warning-danger !border-red-500",
      ],
      [
        "warning disabled",
        { intent: "warning", size: "large", disabled: true },
        "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 button--warning-disabled text-black button--warning-danger !border-red-500",
      ],
      [
        "warning enabled",
        { intent: "warning", size: "large", disabled: false },
        "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 button--warning-enabled text-gray-800 button--warning-danger !border-red-500",
      ],
      [
        "class",
        { intent: "primary", class: "adhoc-class" },
        "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase adhoc-class",
      ],
      [
        "className",
        { intent: "primary", className: "adhoc-classname" },
        "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase adhoc-classname",
      ],
    ];
    matrix("with base / with defaults", "string class", stringClass, rows);
    matrix(
      "with base / with defaults",
      "string className",
      stringClassName,
      rows,
    );
    matrix("with base / with defaults", "array class", arrayClass, rows);
    matrix(
      "with base / with defaults",
      "array className",
      arrayClassName,
      rows,
    );
    for (const [name, component] of [
      ["string class", stringClass],
      ["string className", stringClassName],
      ["array class", arrayClass],
      ["array className", arrayClassName],
    ] as const) {
      test(`with base / with defaults / ${name} / invalid prop`, () => {
        // @ts-expect-error — deliberately invalid runtime input
        expect(component({ aCheekyInvalidProp: "lol" })).toBe(
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        );
      });
    }
  });
});

describe("cva type contracts", () => {
  test("keeps component parameters, variant props, and returns exact", () => {
    const button = cva({
      variants: {
        disabled: { unset: null, true: "disabled", false: "enabled" },
        m: { 0: "m-0", 1: "m-1" },
        intent: { primary: "primary", secondary: "secondary" },
      },
    });

    type ButtonProps =
      | ({
          disabled?: boolean | "unset" | undefined;
          m?: 0 | 1 | undefined;
          intent?: "primary" | "secondary" | undefined;
        } & (
          | { class?: CVA.ClassValue; className?: never }
          | { class?: never; className?: CVA.ClassValue }
        ))
      | undefined;

    expectTypeOf<Parameters<typeof button>[0]>().toEqualTypeOf<ButtonProps>();
    expectTypeOf<ReturnType<typeof button>>().toEqualTypeOf<string>();
    expectTypeOf<CVA.VariantProps<typeof button>>().toEqualTypeOf<{
      disabled?: boolean | "unset" | undefined;
      m?: 0 | 1 | undefined;
      intent?: "primary" | "secondary" | undefined;
    }>();

    button();
    button(undefined);
    button({ disabled: true, m: 0 });
    button({ disabled: false, m: 1 });
    button({ class: "button" });
    button({ className: "button" });
    // @ts-expect-error — beta components do not accept null props
    button(null);
    // @ts-expect-error — unknown variant names are rejected
    button({ unknown: "value" });
    // @ts-expect-error — unknown variant values are rejected
    button({ intent: "unknown" });
    // @ts-expect-error — boolean variant props do not accept stringified values
    button({ disabled: "true" });
    // @ts-expect-error — numeric variant props do not accept stringified values
    button({ m: "0" });
    // @ts-expect-error — class and className are mutually exclusive
    button({ class: "button", className: "button" });
  });

  test("rejects invalid beta configurations", () => {
    // prettier-ignore
    // @ts-expect-error — defaults must target a declared value
    cva({ variants: { tone: { quiet: "quiet", loud: "loud" } }, defaultVariants: { tone: "unknown" } });
    // prettier-ignore
    // @ts-expect-error — compound selectors must target declared values
    cva({ variants: { tone: { quiet: "quiet", loud: "loud" } }, compoundVariants: [{ tone: "unknown", class: "compound" }] });
    // prettier-ignore
    // @ts-expect-error — compound class props are mutually exclusive
    cva({ variants: { tone: { quiet: "quiet", loud: "loud" } }, compoundVariants: [{ tone: "quiet", class: "compound", className: "compound" }] });
    // @ts-expect-error — beta cva requires a configuration object
    cva();
  });

  test("keeps nested readonly composition props exact", () => {
    const spacing = cva({
      variants: { gap: { sm: "gap-sm", lg: "gap-lg" } },
      defaultVariants: { gap: "sm" },
    });
    const tone = cva({
      variants: { tone: { quiet: "quiet", loud: "loud" } },
      defaultVariants: { tone: "quiet" },
    });
    const middle = cva({ composes: [spacing, tone] as const });
    const card = cva({ composes: [middle] as const });

    expectTypeOf<CVA.VariantProps<typeof card>>().toEqualTypeOf<{
      gap?: "sm" | "lg" | undefined;
      tone?: "quiet" | "loud" | undefined;
    }>();
    expectTypeOf(getSchema(card)).toEqualTypeOf<{
      gap: { values: readonly ("sm" | "lg")[]; defaultValue: "sm" };
      tone: { values: readonly ("quiet" | "loud")[]; defaultValue: "quiet" };
    }>();
  });

  test("keeps the last composed default literal exact", () => {
    const compact = cva({
      variants: { pad: { sm: "pad-sm", lg: "pad-lg" } },
      defaultVariants: { pad: "sm" },
    });
    const spacious = cva({
      variants: { pad: { sm: "pad-sm", lg: "pad-lg" } },
      defaultVariants: { pad: "lg" },
    });
    const card = cva({ composes: [compact, spacious] as const });

    expectTypeOf(getSchema(card).pad.defaultValue).toEqualTypeOf<"lg">();
    expect(card()).toBe("pad-lg pad-lg");
  });
});

describe("cva — runtime semantics", () => {
  /** `compose`'s declared return type omits the `config` its runtime sets. */
  const composedConfig = (component: unknown) =>
    (component as { config: Record<string, unknown> }).config;

  /** Captures the exact argument stream the concatenator receives. */
  const recorder = () => {
    const calls: CVA.ClassValue[][] = [];
    const recording: CVA.CX = (...inputs) => {
      calls.push(inputs);
      return clsx(...inputs);
    };
    return { calls, ...defineConfig({ cx: recording }) };
  };

  describe("the concatenator argument stream", () => {
    test("an absent, null or empty config passes no arguments", () => {
      const { calls, cva: recordingCva } = recorder();

      // @ts-expect-error — a config is required by the types
      expect(recordingCva()()).toBe("");
      // @ts-expect-error — as above
      expect(recordingCva(undefined)()).toBe("");
      expect(
        recordingCva(
          // @ts-expect-error — as above
          null,
        )(),
      ).toBe("");
      expect(recordingCva({})()).toBe("");

      // Notably `null` is never forwarded on behalf of an absent `base`.
      expect(calls).toEqual([[], [], [], []]);
    });

    test("an authored null base is forwarded, an absent one is not", () => {
      const { calls, cva: recordingCva } = recorder();

      recordingCva({ base: null })();
      recordingCva({ base: undefined })();

      expect(calls).toEqual([[null], []]);
    });

    test("compound class then className, then the caller's class then className", () => {
      const { calls, cva: recordingCva } = recorder();
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
        // One compound carrying both class props: the authoring types name
        // them mutually exclusive, the runtime appends whichever are present.
        compoundVariants,
        defaultVariants: { intent: "primary" },
      });

      button({
        class: "caller-class",
        // @ts-expect-error — as above
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

    test("is invoked as a method of the options object", () => {
      const options = {
        marker: "self",
        cx(this: { marker: string }, ...inputs: CVA.ClassValue[]) {
          return `${this.marker}:${clsx(...inputs)}`;
        },
      };
      const { cva: selfCva, cx: selfCx } = defineConfig(options);

      expect(selfCx("a", undefined, "b")).toBe("self:a b");
      expect(selfCva({ base: "x" })({ class: "y" })).toBe("self:x y");
    });
  });

  describe("hooks", () => {
    test("are read per call, so one installed after defineConfig is honoured", () => {
      const hooks: {
        "cx:done"?: (className: string) => string;
        onComplete?: (className: string) => string;
      } = {};
      const { cva: hookedCva, cx: hookedCx } = defineConfig({
        cx: clsx,
        hooks,
      });
      const button = hookedCva({ base: "button" });

      expect(hookedCx("x")).toBe("x");
      expect(button()).toBe("button");

      hooks.onComplete = (className) => `<${className}>`;
      expect(hookedCx("x")).toBe("<x>");
      expect(button()).toBe("<button>");

      // `cx:done` still wins over `onComplete` when both are set.
      hooks["cx:done"] = (className) => `[${className}]`;
      expect(button()).toBe("[button]");

      // …unless it is nullish, which falls back rather than skipping both.
      hooks["cx:done"] = undefined;
      expect(button()).toBe("<button>");
    });
  });

  describe("live config reads", () => {
    test("a mutated variant value is picked up on the next call", () => {
      const variants = { intent: { primary: "intent-primary" } };
      const button = cva({
        base: "button",
        variants,
        compoundVariants: [{ intent: "primary", class: "compound-primary" }],
        defaultVariants: { intent: "primary" },
      });

      expect(button()).toBe("button intent-primary compound-primary");
      expect(button({ intent: "primary" })).toBe(
        "button intent-primary compound-primary",
      );

      variants.intent.primary = "intent-primary-changed";

      expect(button()).toBe("button intent-primary-changed compound-primary");
      expect(button({ intent: "primary" })).toBe(
        "button intent-primary-changed compound-primary",
      );
    });

    test("base, variants and compoundVariants replaced wholesale are picked up", () => {
      const config = {
        base: "button",
        variants: { intent: { primary: "intent-primary" } },
        compoundVariants: [
          { intent: "primary" as const, class: "compound-primary" },
        ],
        defaultVariants: { intent: "primary" as const },
      };
      const button = cva(config);

      expect(button()).toBe("button intent-primary compound-primary");

      config.base = "button-swapped";
      config.variants = { intent: { primary: "intent-swapped" } };
      config.compoundVariants = [
        { intent: "primary", class: "compound-swapped" },
      ];

      expect(button()).toBe("button-swapped intent-swapped compound-swapped");
      expect(button({ intent: "primary" })).toBe(
        "button-swapped intent-swapped compound-swapped",
      );
    });

    test("a component appended to the authored composes array is picked up", () => {
      const box = cva({ base: "box" });
      const stack = cva({ base: "stack" });
      const composes = [box];
      const card = cva({ composes, base: "card" });

      expect(card()).toBe("box card");

      composes.push(stack);

      expect(card()).toBe("box stack card");
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

    test("inherited keys on a composed config are ignored by compose", () => {
      const inherited: Record<string, unknown> = Object.create({
        base: "inherited-base",
      });
      inherited.variants = { pad: { sm: "p-1" } };
      const rogue = Object.assign(() => "rogue", { config: inherited });

      const card = compose(rogue);

      expect(composedConfig(card)).toStrictEqual({
        variants: { pad: { sm: "p-1" } },
      });
      expect(card()).toBe("rogue");
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
  });

  describe("prototype safety", () => {
    const polluted = () => JSON.parse('{"__proto__": {"polluted": "yes"}}');

    test("an own __proto__ key in defaultVariants stays a data property", () => {
      const child = cva({
        base: "child",
        variants: { intent: { primary: "intent-primary" } },
        defaultVariants: polluted(),
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

    // A deliberate, documented behaviour change for a typed-but-degenerate
    // input, not parity: the old runtime silently dropped a `__proto__`
    // variant key, because its per-source `{ ...acc }` reset the accumulator
    // the key had just reparented. The accumulator is now reused across
    // sources, so it keeps the key as an own data property instead.
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

      expect(parent(polluted())).toBe("child parent");
      expect(Object.getPrototypeOf(seen[0])).toBe(Object.prototype);
      expect(Object.hasOwnProperty.call(seen[0], "__proto__")).toBe(true);
      expect({}).not.toHaveProperty("polluted");
    });
  });

  describe("composition", () => {
    test("an explicit undefined prop falls back to the composed default", () => {
      const box = cva({
        variants: { pad: { sm: "p-1", lg: "p-4" } },
        defaultVariants: { pad: "sm" },
      });
      const card = cva({ composes: box, base: "card" });

      expect(card({ pad: undefined })).toBe("p-1 card");
      expect(card({ pad: "lg" })).toBe("p-4 card");
    });

    // A `function` child (not an arrow) so its receiver is observable. Each
    // child is read out of the internal component array before being called,
    // or that array would arrive as the child's `this`. Whether an absent
    // receiver is substituted by `globalThis` is decided by the child
    // function's own strictness, not the caller's; this file is an ES module,
    // so the child is strict and a detached call yields `undefined`.
    const receiverProbe = () => {
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

    test("a composed child is called without the component array as receiver", () => {
      const { child, seen } = receiverProbe();
      const card = cva({ composes: [child], base: "card" });

      expect(card()).toBe("child card");
      expect(seen).toStrictEqual([undefined]);
    });

    test("compose calls each child without the component array as receiver", () => {
      const { child, seen } = receiverProbe();
      const card = compose(child);

      expect(card()).toBe("child");
      expect(seen).toStrictEqual([undefined]);
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

    test("compose replaces array-valued config keys rather than merging them", () => {
      const first = cva({
        base: "first",
        variants: { intent: { primary: "intent-primary" } },
        compoundVariants: [{ intent: "primary", class: "first-compound" }],
      });
      const second = cva({
        base: "second",
        variants: { intent: { primary: "intent-primary" } },
        compoundVariants: [{ intent: "primary", class: "second-compound" }],
      });
      const card = compose(first, second);

      expect(composedConfig(card).base).toBe("second");
      expect(composedConfig(card).compoundVariants).toStrictEqual([
        { intent: "primary", class: "second-compound" },
      ]);
    });
  });
});
