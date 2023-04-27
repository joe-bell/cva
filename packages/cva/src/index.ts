import clsx from "clsx";

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

type VariantShape = Record<string, Record<string, ClassValue>>;

type VariantSchema<V extends VariantShape> = {
  [Variant in keyof V]?:
    | StringToBoolean<keyof V[Variant]>
    | "unset"
    | undefined;
};

type VariantSchemaMultiple<V extends VariantShape> = {
  [Variant in keyof V]?:
    | StringToBoolean<keyof V[Variant]>
    | StringToBoolean<keyof V[Variant]>[]
    | undefined;
};

type ConfigBase = { base?: ClassValue };

type Config<V> = V extends VariantShape
  ? ConfigBase & {
      variants?: V;
      compoundVariants?: (V extends VariantShape
        ? (VariantSchema<V> | VariantSchemaMultiple<V>) & ClassProp
        : ClassProp)[];
      defaultVariants?: VariantSchema<V>;
    }
  : ConfigBase & {
      variants?: never;
      compoundVariants?: never;
      defaultVariants?: never;
    };

type Props<V> = V extends VariantShape
  ? VariantSchema<V> & ClassProp
  : ClassProp;

export const cva =
  <
    _ extends "cva's generic parameters are restricted to internal use only.",
    V
  >(
    config: Config<V>
  ) =>
  (props?: Props<V>) => {
    if (config?.variants == null)
      return cx(config?.base, props?.class, props?.className);

    const { variants, defaultVariants } = config;

    const getVariantClassNames = Object.keys(variants).map(
      (variant: keyof typeof variants) => {
        const variantProp = props?.[variant as keyof typeof props];
        const defaultVariantProp = defaultVariants?.[variant];

        if (variantProp === "unset") return undefined;

        const variantKey = (falsyToString(variantProp) ||
          falsyToString(
            defaultVariantProp
          )) as keyof typeof variants[typeof variant];

        return variants[variant][variantKey];
      }
    );

    const defaultsAndProps = {
      ...defaultVariants,
      // remove `undefined` props
      ...(props &&
        Object.entries(props).reduce<typeof props>(
          (acc, [key, value]) =>
            typeof value === "undefined" ? acc : { ...acc, [key]: value },
          {} as typeof props
        )),
    };

    const getCompoundVariantClassNames = config?.compoundVariants?.reduce(
      (acc, { class: cvClass, className: cvClassName, ...cvConfig }) =>
        Object.entries(cvConfig).every(([cvKey, cvSelector]) => {
          const selector =
            defaultsAndProps[cvKey as keyof typeof defaultsAndProps];

          return Array.isArray(cvSelector)
            ? cvSelector.includes(selector)
            : selector === cvSelector;
        })
          ? [...acc, cvClass, cvClassName]
          : acc,
      [] as ClassValue[]
    );

    return cx(
      config?.base,
      getVariantClassNames,
      getCompoundVariantClassNames,
      props?.class,
      props?.className
    );
  };
