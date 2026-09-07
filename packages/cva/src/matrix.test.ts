import type * as CVA from "./";
import { cva } from "./";

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
  intent?: "unset" | "primary" | "secondary" | "warning" | "danger" | undefined;
  disabled?: "unset" | boolean | undefined;
  size?: "unset" | "small" | "medium" | "large" | undefined;
  m?: "unset" | 0 | 1 | undefined;
};

type VariantPropsWithoutM = {
  intent?: "unset" | "primary" | "secondary" | "warning" | "danger" | undefined;
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

describe("cva — variant matrix", () => {
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
