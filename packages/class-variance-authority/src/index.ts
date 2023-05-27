import clsx from "clsx";

/* Types
  ============================================ */

/* clsx
  ---------------------------------- */

// When compiling with `declaration: true`, many projects experience the dreaded
// TS2742 error. To combat this, we copy clsx's types manually.
// Should this project move to JSDoc, this workaround would no longer be needed.

type ClassValue =
  | ClassArray
  | ClassDictionary
  | string
  | number
  | null
  | boolean
  | undefined;
type ClassDictionary = Record<string, any>;
type ClassArray = ClassValue[];

/* Utils
  ---------------------------------- */

type OmitUndefined<T> = T extends undefined ? never : T;
type StringToBoolean<T> = T extends "true" | "false" ? boolean : T;

export type VariantProps<Component extends (...args: any) => any> = Omit<
  OmitUndefined<Parameters<Component>[0]>,
  "class" | "className"
>;

/* cx
  ---------------------------------- */

export interface CX {
  (...inputs: ClassValue[]): string;
}

export type CXOptions = Parameters<CX>;
export type CXReturn = ReturnType<CX>;

/**
 * @deprecated use `CXOptions`
 */
export type CxOptions = CXOptions;
/**
 * @deprecated use `CXReturn`
 */
export type CxReturn = CXReturn;

/* cva
  ---------------------------------- */

type CVAConfigSchema = Record<string, Record<string, ClassValue>>;
type CVAConfigVariants<T extends CVAConfigSchema> = {
  [Variant in keyof T]?: StringToBoolean<keyof T[Variant]> | null | undefined;
};
type CVAClassProp =
  | {
      class: ClassValue;
      className?: never;
    }
  | { class?: never; className: ClassValue }
  | { class?: never; className?: never };

export interface CVA {
  <T>(
    base?: ClassValue,
    config?: T extends CVAConfigSchema
      ? {
          variants?: T;
          defaultVariants?: CVAConfigVariants<T>;
          compoundVariants?: (T extends CVAConfigSchema
            ? (
                | CVAConfigVariants<T>
                | {
                    [Variant in keyof T]?:
                      | StringToBoolean<keyof T[Variant]>
                      | StringToBoolean<keyof T[Variant]>[]
                      | undefined;
                  }
              ) &
                CVAClassProp
            : CVAClassProp)[];
        }
      : never
  ): (
    props?: T extends CVAConfigSchema
      ? CVAConfigVariants<T> & CVAClassProp
      : CVAClassProp
  ) => string;
}

/* create
  ---------------------------------- */

export interface CreateOptions {
  hooks?: {
    "cx:done"?: (className: string) => string;
  };
}

export interface Create {
  (options?: CreateOptions): {
    cx: CX;
    cva: CVA;
  };
}

/* Exports
  ============================================ */

const falsyToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;

export const create: Create = (options) => {
  const cx: CX = (...inputs) =>
    typeof options?.hooks?.["cx:done"] !== "undefined"
      ? options?.hooks["cx:done"](clsx(inputs))
      : clsx(inputs);

  const cva: CVA = (base, config) => (props) => {
    if (config?.variants == null)
      return cx(base, props?.class, props?.className);

    const { variants, defaultVariants } = config;

    const getVariantClassNames = Object.keys(variants).map(
      (variant: keyof typeof variants) => {
        const variantProp = props?.[variant as keyof typeof props];
        const defaultVariantProp = defaultVariants?.[variant];

        if (variantProp === null) return null;

        const variantKey = (falsyToString(variantProp) ||
          falsyToString(
            defaultVariantProp
          )) as keyof typeof variants[typeof variant];

        return variants[variant][variantKey];
      }
    );

    const propsWithoutUndefined =
      props &&
      Object.entries(props).reduce((acc, [key, value]) => {
        if (value === undefined) {
          return acc;
        }

        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>);

    const getCompoundVariantClassNames = config?.compoundVariants?.reduce(
      (
        acc,
        { class: cvClass, className: cvClassName, ...compoundVariantOptions }
      ) =>
        Object.entries(compoundVariantOptions).every(([key, value]) =>
          Array.isArray(value)
            ? value.includes(
                {
                  ...defaultVariants,
                  ...propsWithoutUndefined,
                }[key]
              )
            : {
                ...defaultVariants,
                ...propsWithoutUndefined,
              }[key] === value
        )
          ? [...acc, cvClass, cvClassName]
          : acc,
      [] as ClassValue[]
    );

    return cx(
      base,
      getVariantClassNames,
      getCompoundVariantClassNames,
      props?.class,
      props?.className
    );
  };

  return {
    cva,
    cx,
  };
};

export const { cva, cx } = create();
