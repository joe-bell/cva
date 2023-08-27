import { clsx } from "clsx";

import type {
  ClassProp,
  ClassValue,
  OmitUndefined,
  StringToBoolean,
} from "./types";

export type VariantProps<Component extends (...args: any) => any> = Omit<
  OmitUndefined<Parameters<Component>[0]>,
  "class" | "className"
>;

const falsyToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;

/* cx
  ============================================ */

export type CxOptions = Parameters<typeof clsx>;
export type CxReturn = ReturnType<typeof clsx>;

export const cx = clsx;

/* cva
  ============================================ */

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

export const cva =
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

    let getCompoundVariantClassNames;
    if (config?.compoundVariants) {
      const combinedProps = props
        ? Object.entries(props).reduce(
            (acc, [key, value]) => {
              if (value === undefined) {
                return acc;
              }

              acc[key] = value;
              return acc;
            },
            { ...defaultVariants } as Record<string, unknown>
          )
        : defaultVariants;

      getCompoundVariantClassNames =
        combinedProps &&
        config.compoundVariants.reduce(
          (
            acc,
            {
              class: cvClass,
              className: cvClassName,
              ...compoundVariantOptions
            }
          ) =>
            Object.entries(compoundVariantOptions).every(([key, value]) => {
              const propVal = combinedProps[key];
              return Array.isArray(value)
                ? value.includes(propVal)
                : propVal === value;
            })
              ? [...acc, cvClass, cvClassName]
              : acc,
          [] as ClassValue[]
        );
    }

    return cx(
      base,
      getVariantClassNames,
      getCompoundVariantClassNames,
      props?.class,
      props?.className
    );
  };
