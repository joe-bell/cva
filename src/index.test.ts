import type * as CVA from "./";
import { cva, cx } from "./";

describe("cx", () => {
  describe.each<CVA.CxOptions>([
    [null, ""],
    [undefined, ""],
    [["foo", null, "bar", undefined, "baz"], "foo bar baz"],
    [
      [
        "foo",
        [
          null,
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
  ])("cx(%o)", (options, expected) => {
    test(`returns ${expected}`, () => {
      expect(cx(options)).toBe(expected);
    });
  });
});

describe("cva", () => {
  describe("without base", () => {
    describe("without anything", () => {
      test("empty", () => {
        const example = cva();
        expect(example()).toBe("");
        expect(
          example({
            // @ts-expect-error
            aCheekyInvalidProp: "lol",
          })
        ).toBe("");
      });

      test("undefined", () => {
        const example = cva(undefined);
        expect(example()).toBe("");
        expect(
          example({
            // @ts-expect-error
            aCheekyInvalidProp: "lol",
          })
        ).toBe("");
      });

      test("null", () => {
        const example = cva(null);
        expect(example()).toBe("");
        expect(
          example({
            // @ts-expect-error
            aCheekyInvalidProp: "lol",
          })
        ).toBe("");
      });
    });

    describe("without defaults", () => {
      type ButtonWithStringClassesProps = CVA.VariantProps<
        typeof buttonWithStringClasses
      >;
      const buttonWithStringClasses = cva(null, {
        variants: {
          intent: {
            primary:
              "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600",
            secondary:
              "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
            warning:
              "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600",
            danger:
              "button--danger bg-red-500 text-white border-transparent hover:bg-red-600",
          },
          disabled: {
            true: "button--disabled opacity-050 cursor-not-allowed",
            false: "button--enabled cursor-pointer",
          },
          size: {
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
            class: "button--warning-disabled text-black",
          },
        ],
      });

      type ButtonWithArrayClassesProps = CVA.VariantProps<
        typeof buttonWithArrayClasses
      >;
      const buttonWithArrayClasses = cva(null, {
        variants: {
          intent: {
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
              "bg-red-500",
              "text-white",
              "border-transparent",
              "hover:bg-red-600",
            ],
          },
          disabled: {
            true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
            false: ["button--enabled", "cursor-pointer"],
          },
          size: {
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
            class: ["button--warning-disabled", "text-black"],
          },
        ],
      });

      describe.each<
        [ButtonWithStringClassesProps | ButtonWithArrayClassesProps, string]
      >([
        // [undefined, ""],
        [{}, ""],
        // [
        //   {
        //     // @ts-expect-error
        //     aCheekyInvalidProp: "lol",
        //   },
        //   "",
        // ],
        [
          { intent: "secondary" },
          "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        ],

        [{ size: "small" }, "button--small text-sm py-1 px-2"],
        [{ disabled: true }, "button--disabled opacity-050 cursor-not-allowed"],
        [
          {
            intent: "secondary",
            // @TODO REMOVE
            // @ts-expect-error
            size: null,
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
      ])("button(%o)", (options, expected) => {
        test(`returns ${expected}`, () => {
          expect(buttonWithStringClasses(options)).toBe(expected);
          expect(buttonWithArrayClasses(options)).toBe(expected);
        });
      });
    });

    describe("with defaults", () => {
      type ButtonWithStringClassesProps = CVA.VariantProps<
        typeof buttonWithStringClasses
      >;
      const buttonWithStringClasses = cva(
        "button font-semibold border rounded",
        {
          variants: {
            intent: {
              primary:
                "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600",
              secondary:
                "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
              warning:
                "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600",
              danger:
                "button--danger bg-red-500 text-white border-transparent hover:bg-red-600",
            },
            disabled: {
              true: "button--disabled opacity-050 cursor-not-allowed",
              false: "button--enabled cursor-pointer",
            },
            size: {
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
              class: "button--warning-disabled text-black",
            },
          ],
          defaultVariants: {
            disabled: false,
            intent: "primary",
            size: "medium",
          },
        }
      );

      type ButtonWithArrayClassesProps = CVA.VariantProps<
        typeof buttonWithArrayClasses
      >;
      const buttonWithArrayClasses = cva(
        ["button", "font-semibold", "border", "rounded"],
        {
          variants: {
            intent: {
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
                "bg-red-500",
                "text-white",
                "border-transparent",
                "hover:bg-red-600",
              ],
            },
            disabled: {
              true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
              false: ["button--enabled", "cursor-pointer"],
            },
            size: {
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
              class: ["button--warning-disabled", "text-black"],
            },
          ],
          defaultVariants: {
            disabled: false,
            intent: "primary",
            size: "medium",
          },
        }
      );

      describe.each<
        [ButtonWithStringClassesProps | ButtonWithArrayClassesProps, string]
      >([
        // [
        //   undefined,
        //   "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        // ],
        [
          {},
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        // [
        //   {
        //     // @ts-expect-error
        //     aCheekyInvalidProp: "lol",
        //   },
        //   "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        // ],
        [
          { intent: "secondary" },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4",
        ],

        [
          { size: "small" },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--small text-sm py-1 px-2",
        ],
        [
          { disabled: true },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--disabled opacity-050 cursor-not-allowed button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        [
          {
            intent: "secondary",
            // @TODO REMOVE
            // @ts-expect-error
            size: null,
          },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer",
        ],
        [
          { intent: "secondary", size: undefined },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4",
        ],
        [
          { intent: "danger", size: "medium" },
          "button font-semibold border rounded button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--enabled cursor-pointer button--medium text-base py-2 px-4",
        ],
        [
          { intent: "warning", size: "large" },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 button--warning-enabled text-gray-800",
        ],
        [
          { intent: "warning", size: "large", disabled: true },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 button--warning-disabled text-black",
        ],
      ])("button(%o)", (options, expected) => {
        test(`returns ${expected}`, () => {
          expect(buttonWithStringClasses(options)).toBe(expected);
          expect(buttonWithArrayClasses(options)).toBe(expected);
        });
      });
    });
  });

  describe("with base", () => {
    describe("without defaults", () => {
      type ButtonWithStringClassesProps = CVA.VariantProps<
        typeof buttonWithStringClasses
      >;
      const buttonWithStringClasses = cva(
        "button font-semibold border rounded",
        {
          variants: {
            intent: {
              primary:
                "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600",
              secondary:
                "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
              warning:
                "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600",
              danger:
                "button--danger bg-red-500 text-white border-transparent hover:bg-red-600",
            },
            disabled: {
              true: "button--disabled opacity-050 cursor-not-allowed",
              false: "button--enabled cursor-pointer",
            },
            size: {
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
              class: "button--warning-disabled text-black",
            },
          ],
        }
      );

      type ButtonWithArrayClassesProps = CVA.VariantProps<
        typeof buttonWithArrayClasses
      >;
      const buttonWithArrayClasses = cva(
        ["button", "font-semibold", "border", "rounded"],
        {
          variants: {
            intent: {
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
                "bg-red-500",
                "text-white",
                "border-transparent",
                "hover:bg-red-600",
              ],
            },
            disabled: {
              true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
              false: ["button--enabled", "cursor-pointer"],
            },
            size: {
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
              class: ["button--warning-disabled", "text-black"],
            },
          ],
        }
      );

      describe.each<
        [ButtonWithStringClassesProps | ButtonWithArrayClassesProps, string]
      >([
        // [undefined, "button font-semibold border rounded"],
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
        // [
        //   { intent: "secondary", size: null },
        //   "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        // ],
        [
          { intent: "secondary", size: undefined },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        ],
        [
          { intent: "danger", size: "medium" },
          "button font-semibold border rounded button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--medium text-base py-2 px-4",
        ],
        [
          { intent: "warning", size: "large" },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4",
        ],
        // [
        //   { intent: "warning", size: "large", disabled: null },
        //   "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4",
        // ],
        [
          { intent: "warning", size: "large", disabled: true },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 button--warning-disabled text-black",
        ],
        [
          { intent: "warning", size: "large", disabled: false },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 button--warning-enabled text-gray-800",
        ],
      ])("button(%o)", (options, expected) => {
        test(`returns ${expected}`, () => {
          expect(buttonWithStringClasses(options)).toBe(expected);
          expect(buttonWithArrayClasses(options)).toBe(expected);
        });
      });
    });

    describe("with defaults", () => {
      type ButtonWithStringClassesProps = CVA.VariantProps<
        typeof buttonWithStringClasses
      >;
      const buttonWithStringClasses = cva(
        "button font-semibold border rounded",
        {
          variants: {
            intent: {
              primary:
                "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600",
              secondary:
                "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
              warning:
                "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600",
              danger:
                "button--danger bg-red-500 text-white border-transparent hover:bg-red-600",
            },
            disabled: {
              true: "button--disabled opacity-050 cursor-not-allowed",
              false: "button--enabled cursor-pointer",
            },
            size: {
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
              class: "button--warning-disabled text-black",
            },
          ],
          defaultVariants: {
            disabled: false,
            intent: "primary",
            size: "medium",
          },
        }
      );

      type ButtonWithArrayClassesProps = CVA.VariantProps<
        typeof buttonWithArrayClasses
      >;
      const buttonWithArrayClasses = cva(
        ["button", "font-semibold", "border", "rounded"],
        {
          variants: {
            intent: {
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
                "bg-red-500",
                "text-white",
                "border-transparent",
                "hover:bg-red-600",
              ],
            },
            disabled: {
              true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
              false: ["button--enabled", "cursor-pointer"],
            },
            size: {
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
              class: ["button--warning-disabled", "text-black"],
            },
          ],
          defaultVariants: {
            disabled: false,
            intent: "primary",
            size: "medium",
          },
        }
      );

      describe.each<
        [ButtonWithStringClassesProps | ButtonWithArrayClassesProps, string]
      >([
        // [
        //   undefined,
        //   "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        // ],
        [
          {},
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        // [
        //   {
        //     // @ts-expect-error
        //     aCheekyInvalidProp: "lol",
        //   },
        //   "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        // ],
        [
          { intent: "secondary" },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4",
        ],

        [
          { size: "small" },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--small text-sm py-1 px-2",
        ],
        // [
        //   { disabled: null },
        //   "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--medium text-base py-2 px-4 button--primary-medium uppercase",
        // ],
        [
          { disabled: false },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--enabled cursor-pointer button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        [
          { disabled: true },
          "button font-semibold border rounded button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600 button--disabled opacity-050 cursor-not-allowed button--medium text-base py-2 px-4 button--primary-medium uppercase",
        ],
        // [
        //   { intent: "secondary", size: null },
        //   "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer",
        // ],
        [
          { intent: "secondary", size: undefined },
          "button font-semibold border rounded button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100 button--enabled cursor-pointer button--medium text-base py-2 px-4",
        ],
        [
          { intent: "danger", size: "medium" },
          "button font-semibold border rounded button--danger bg-red-500 text-white border-transparent hover:bg-red-600 button--enabled cursor-pointer button--medium text-base py-2 px-4",
        ],
        [
          { intent: "warning", size: "large" },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 button--warning-enabled text-gray-800",
        ],
        [
          {
            intent: "warning",
            size: "large",
            // @TODO REMOVE
            // @ts-expect-error
            disabled: null,
          },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--large text-lg py-2.5 px-4",
        ],
        [
          { intent: "warning", size: "large", disabled: true },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--disabled opacity-050 cursor-not-allowed button--large text-lg py-2.5 px-4 button--warning-disabled text-black",
        ],
        [
          { intent: "warning", size: "large", disabled: false },
          "button font-semibold border rounded button--warning bg-yellow-500 border-transparent hover:bg-yellow-600 button--enabled cursor-pointer button--large text-lg py-2.5 px-4 button--warning-enabled text-gray-800",
        ],
      ])("button(%o)", (options, expected) => {
        test(`returns ${expected}`, () => {
          expect(buttonWithStringClasses(options)).toBe(expected);
          expect(buttonWithArrayClasses(options)).toBe(expected);
        });
      });
    });
  });

  describe("composing classes", () => {
    type BoxProps = CVA.VariantProps<typeof box>;
    const box = cva(["box", "box-border"], {
      variants: {
        margin: { 0: "m-0", 2: "m-2", 4: "m-4", 8: "m-8" },
        padding: { 0: "p-0", 2: "p-2", 4: "p-4", 8: "p-8" },
      },
      defaultVariants: {
        margin: 0,
        padding: 0,
      },
    });

    type CardBaseProps = CVA.VariantProps<typeof cardBase>;
    const cardBase = cva(
      ["card", "border-solid", "border-slate-300", "rounded"],
      {
        variants: {
          shadow: {
            md: "drop-shadow-md",
            lg: "drop-shadow-lg",
            xl: "drop-shadow-xl",
          },
        },
      }
    );

    interface CardProps extends BoxProps, CardBaseProps {}
    const card = ({ margin, padding, shadow }: CardProps = {}) =>
      cx(box({ margin, padding }), cardBase({ shadow }));

    describe.each<[CardProps, string]>([
      [
        // @ts-expect-error
        undefined,
        "box box-border m-0 p-0 card border-solid border-slate-300 rounded",
      ],
      [{}, "box box-border m-0 p-0 card border-solid border-slate-300 rounded"],
      [
        { margin: 4 },
        "box box-border m-4 p-0 card border-solid border-slate-300 rounded",
      ],
      [
        { padding: 4 },
        "box box-border m-0 p-4 card border-solid border-slate-300 rounded",
      ],
      [
        { margin: 2, padding: 4 },
        "box box-border m-2 p-4 card border-solid border-slate-300 rounded",
      ],
      [
        { shadow: "md" },
        "box box-border m-0 p-0 card border-solid border-slate-300 rounded drop-shadow-md",
      ],
    ])("card(%o)", (options, expected) => {
      test(`returns ${expected}`, () => {
        expect(card(options)).toBe(expected);
      });
    });
  });
});
