import { clsx } from "clsx";
import type * as CVA from "./";
import { compose, cva, defineConfig, getSchema } from "./";

describe("cva — runtime semantics", () => {
  // `compose`'s declared return type omits the `config` its runtime sets.
  const composedConfig = (component: unknown) =>
    (component as { config: Record<string, unknown> }).config;

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

    test("detaches child calls in both composition APIs", () => {
      const composed = createReceiverRecorder();
      const legacy = createReceiverRecorder();

      expect(cva({ composes: [composed.child], base: "card" })()).toBe(
        "child card",
      );
      expect(compose(legacy.child)()).toBe("child");

      expect(composed.seen).toStrictEqual([undefined]);
      expect(legacy.seen).toStrictEqual([undefined]);
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

  describe("hooks and the concatenator receiver", () => {
    test("hooks are read per call, so a later install is honoured", () => {
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
      expect(button({ className: "c" })).toBe("<button c>");

      // `cx:done` still wins over `onComplete` when both are set.
      hooks["cx:done"] = (className) => `[${className}]`;
      expect(button()).toBe("[button]");

      // …unless it is nullish, which falls back rather than skipping both.
      hooks["cx:done"] = undefined;
      expect(button()).toBe("<button>");
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
