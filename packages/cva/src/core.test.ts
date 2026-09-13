import { clsx } from "clsx";
import type * as CVA from "./";
import { compose, cva, defineConfig, getSchema } from "./";

describe("cva — runtime semantics", () => {
  // `compose`'s declared return type omits the `config` its runtime sets.
  const composedConfig = (component: unknown) =>
    (component as { config: Record<string, unknown> }).config;

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
      // @ts-expect-error — `undefined` is not a config
      expect(recordingCva(undefined)()).toBe("");
      expect(
        recordingCva(
          // @ts-expect-error — `null` is not a config
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

    test("calls the concatenator with options as its receiver", () => {
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

    test("a frozen config works and the authored objects are left alone", () => {
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

      // The same shape unfrozen: nothing the caller owns is mutated or frozen.
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

    test("recreating the component picks up changes; the original does not", () => {
      const { calls, cva: recordingCva } = recorder();
      const config = {
        base: "button" as CVA.ClassValue,
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
      const button = recordingCva(config);

      expect(button()).toBe("button intent-primary compound-primary");

      config.variants.intent.secondary = "intent-changed";
      config.compoundVariants = [
        { intent: "secondary", class: "compound-changed" },
      ];
      config.defaultVariants = { intent: "secondary" };

      // The original keeps the default it was created with.
      expect(button()).toBe("button intent-primary compound-primary");
      // A component created afterwards gets the new one.
      expect(recordingCva(config)()).toBe(
        "button intent-changed compound-changed",
      );

      // A replaced `base`, including through `null` and `undefined`: only a
      // component created afterwards forwards the new value.
      calls.length = 0;
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

      // Neither re-reads it: the child resolved its own default when it was
      // created, and the parent merged that config when it was created.
      expect(child()).toBe("child-primary");
      expect(card()).toBe("child-primary card");

      // A parent created afterwards merges the child's config as it now
      // stands, which is what "read when the component is created" means.
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
      // Read once to resolve the variant and once to build the child's own
      // props, both before the child ran, and never again afterwards.
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

    // Use a regular function to observe `this`. In this ES module,
    // a detached call receives `undefined`.
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

  describe("output parity across call shapes", () => {
    test("repeated calls stream the same base and variants", () => {
      const { calls, cva: recordingCva } = recorder();
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
      const { calls, cva: recordingCva } = recorder();
      const button = recordingCva({
        variants: { intent: { primary: "intent-primary" } },
      });

      expect(button()).toBe("");
      expect(button({ className: "n" })).toBe("n");

      expect(calls).toEqual([[], ["n"]]);
    });

    test("compounds match against the defaults and against supplied props", () => {
      const button = cva({
        base: "button",
        variants: {
          intent: { primary: "intent-primary", secondary: "intent-secondary" },
        },
        compoundVariants: [
          { intent: "primary", class: "compound-primary" },
          { intent: ["secondary"], class: "compound-secondary" },
        ],
        defaultVariants: { intent: "primary" },
      });

      expect(button()).toBe("button intent-primary compound-primary");
      expect(button({ intent: "secondary" })).toBe(
        "button intent-secondary compound-secondary",
      );
    });

    test("a prop equal to its default streams the same as omitting it", () => {
      const { calls, cva: recordingCva } = recorder();
      const button = recordingCva({
        base: "button",
        variants: { intent: { primary: "intent-primary" } },
        compoundVariants: [{ intent: "primary", class: "compound-primary" }],
        defaultVariants: { intent: "primary" },
      });

      button();
      button({ intent: "primary" });

      // Supplying the default and omitting it give the same stream.
      expect(calls).toEqual([
        ["button", "intent-primary", "compound-primary"],
        ["button", "intent-primary", "compound-primary"],
      ]);
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

  describe("plain-component fast path", () => {
    test("builds the same argument stream as the general path", () => {
      const { calls, cva: recordingCva } = recorder();

      recordingCva({ base: "b" })();
      recordingCva({ base: "b" })({ className: "c" });
      recordingCva({ base: "b" })({ class: "c" });
      recordingCva({ base: "b" })({
        class: "c",
        // @ts-expect-error — `class` and `className` are mutually exclusive
        className: "n",
      });
      recordingCva({})({ className: "c" });

      // A null class value is a value, not an absence: it is forwarded.
      recordingCva({ base: "b" })({ class: null });
      recordingCva({ base: "b" })({ className: null });
      recordingCva({ base: "b" })({
        class: null,
        // @ts-expect-error — `class` and `className` are mutually exclusive
        className: null,
      });

      expect(calls).toEqual([
        ["b"],
        ["b", "c"],
        ["b", "c"],
        ["b", "c", "n"],
        ["c"],
        ["b", null],
        ["b", null],
        ["b", null, null],
      ]);
    });

    test("a falsy base is forwarded, an absent one is not", () => {
      const { calls, cva: recordingCva } = recorder();

      recordingCva({ base: null })({ className: "c" });
      recordingCva({ base: false })({ className: "c" });
      recordingCva({ base: 0 })({ className: "c" });
      recordingCva({ base: "" })({ className: "c" });
      recordingCva({ base: undefined })({ className: "c" });

      expect(calls).toEqual([
        [null, "c"],
        [false, "c"],
        [0, "c"],
        ["", "c"],
        ["c"],
      ]);
    });

    test("props that are absent, null or a primitive stream the base alone", () => {
      const { calls, cva: recordingCva } = recorder();
      const button = recordingCva({ base: "b" });

      button();
      // @ts-expect-error — `null` is not a props object
      button(null);
      // @ts-expect-error — a primitive is not a props object
      button("truthy");

      expect(calls).toEqual([["b"], ["b"], ["b"]]);
    });

    test("empty variants stream exactly like a config without them", () => {
      const { calls, cva: recordingCva } = recorder();

      recordingCva({ base: "b", variants: {} })();
      recordingCva({ base: "b", variants: {} })({ className: "c" });
      recordingCva({ base: "b", variants: {} })({ class: "c" });
      recordingCva({ variants: {} })({ className: "c" });

      expect(calls).toEqual([["b"], ["b", "c"], ["b", "c"], ["c"]]);
    });

    test("empty compoundVariants stream exactly like a config without them", () => {
      const { calls, cva: recordingCva } = recorder();
      // Annotated because the authoring types accept `compoundVariants` only
      // alongside `variants`; `variants` is declared and never assigned.
      type Config = {
        base?: CVA.ClassValue;
        variants?: CVA.CVAVariantShape;
        compoundVariants?: { class?: string }[];
      };
      const withBase: Config = { base: "b", compoundVariants: [] };
      const withoutBase: Config = { compoundVariants: [] };

      recordingCva(withBase)();
      recordingCva(withBase)({ className: "c" });
      recordingCva(withBase)({ class: "c" });
      recordingCva(withoutBase)({ className: "c" });

      expect(calls).toEqual([["b"], ["b", "c"], ["b", "c"], ["c"]]);
    });

    test("a compound selecting on the 33rd variant key still matches", () => {
      const variants: CVA.CVAVariantShape = {};
      for (let index = 0; index < 33; index++) {
        variants[`k${index}`] = { on: `k${index}-on` };
      }
      const button = cva({
        variants,
        compoundVariants: [
          // Bit 32 is outside the mask, so every call takes the general path.
          { k32: "on", class: "compound-last" },
          // No keys, so its definition-time match stands for every call.
          { class: "compound-always" },
        ],
      }) as CVA.CVAComponentShape;

      expect(button({ k32: "on" })).toBe(
        "k32-on compound-last compound-always",
      );
      expect(button({ k32: "off" })).toBe("compound-always");
      expect(button()).toBe("compound-always");
    });

    test("a hook installed after defineConfig is honoured on the fast path", () => {
      const hooks: { onComplete?: (className: string) => string } = {};
      const { cva: hookedCva } = defineConfig({ cx: clsx, hooks });
      const button = hookedCva({ base: "button" });

      expect(button()).toBe("button");

      hooks.onComplete = (className) => `<${className}>`;

      expect(button()).toBe("<button>");
      expect(button({ className: "c" })).toBe("<button c>");
    });

    test("calls the concatenator with options as its receiver on the fast path", () => {
      const options = {
        marker: "self",
        cx(this: { marker: string }, ...inputs: CVA.ClassValue[]) {
          return `${this.marker}:${clsx(...inputs)}`;
        },
      };
      const button = defineConfig(options).cva({ base: "x" });

      expect(button()).toBe("self:x");
      expect(button({ className: "y" })).toBe("self:x y");
    });
  });
});
