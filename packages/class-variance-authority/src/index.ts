import clsx from "clsx";

type ClassPropKey = "class" | "className";

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

type ClassProp =
  | {
      class: ClassValue;
      className?: never;
    }
  | { class?: never; className: ClassValue }
  | { class?: never; className?: never };

type OmitUndefined<T> = T extends undefined ? never : T;
type StringToBoolean<T> = T extends "true" | "false" ? boolean : T;

/* Utils
  ============================================ */

const falsyToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;

/* `create()`
  ============================================ */

interface CreateOptions {
  hooks?: {
    "cx:done"?: (className: string) => string;
  };
}

export const create = (options?: CreateOptions) => {
  /* cx
    ---------------------------------- */

  const cx = (...inputs: ClassValue[]): string =>
    typeof options?.hooks?.["cx:done"] !== "undefined"
      ? options?.hooks["cx:done"](clsx(inputs))
      : clsx(inputs);

  /* cva
    ---------------------------------- */

  type ConfigSchema = Record<string, Record<string, ClassValue>>;

  type ConfigVariants<T extends ConfigSchema> = {
    [Variant in keyof T]?: StringToBoolean<keyof T[Variant]> | null | undefined;
  };
  type ConfigVariantsMulti<T extends ConfigSchema> = {
    [Variant in keyof T]?:
      | StringToBoolean<keyof T[Variant]>
      | StringToBoolean<keyof T[Variant]>[]
      | undefined;
  };

  type Config<T> = T extends ConfigSchema
    ? {
        variants?: T;
        defaultVariants?: ConfigVariants<T>;
        compoundVariants?: (T extends ConfigSchema
          ? (ConfigVariants<T> | ConfigVariantsMulti<T>) & ClassProp
          : ClassProp)[];
      }
    : never;

  type Props<T> = T extends ConfigSchema
    ? ConfigVariants<T> & ClassProp
    : ClassProp;

  const cva =
    <T>(base?: ClassValue, config?: Config<T>) =>
    (props?: Props<T>) => {
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

/* Default `cva()` and `cx()`
  ============================================ */

export const { cva, cx } = create();

export type CxOptions = Parameters<typeof cx>;
export type CxReturn = ReturnType<typeof cx>;

/* Public Types
  ============================================ */

export type VariantProps<Component extends (...args: any) => any> = Omit<
  OmitUndefined<Parameters<Component>[0]>,
  ClassPropKey
>;
