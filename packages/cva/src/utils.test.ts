import { compose, cva } from "./";
import { getSchema } from "./utils";

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
    // @ts-expect-error: not a cva()-created component at all
    expect(getSchema(plainFunction)).toStrictEqual({});
  });

  test("should keep a defaulted variant that has no values", () => {
    const component = cva({
      variants: { size: {} },
      // @ts-expect-error: an empty variant has no values to default to
      defaultVariants: { size: "md" },
    });

    // @ts-expect-error: rejected at the type level for the same reason,
    // but the runtime schema still reports the default.
    expect(getSchema(component)).toStrictEqual({
      size: { defaultValue: "md" },
    });
  });

  test("should drop a variant with neither values nor a default", () => {
    const component = cva({
      variants: { size: {}, intent: { primary: "button--primary" } },
    });

    expect(getSchema(component)).toStrictEqual({
      intent: { values: ["primary"] },
    });
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

  test("keeps canonical and noncanonical schema keys distinct", () => {
    const component = cva({
      variants: {
        offset: { 1: "one", "01": "leading-zero", " 1": "space", "": "empty" },
      },
      defaultVariants: { offset: 1 },
    });
    const schema = getSchema(component);

    // Integer keys enumerate first, then noncanonical string keys in insertion order.
    expect(schema).toStrictEqual({
      offset: { values: [1, "01", " 1", ""], defaultValue: 1 },
    });
    expectTypeOf(schema).toEqualTypeOf<{
      offset: {
        values: readonly (1 | "01" | " 1" | "")[];
        defaultValue: 1;
      };
    }>();
  });
});
